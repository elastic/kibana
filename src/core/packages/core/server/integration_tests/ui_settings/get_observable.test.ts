/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import { schema } from '@kbn/config-schema';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { REPO_ROOT } from '@kbn/repo-info';
import { stripVersionQualifier } from '@kbn/std';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import type { Root } from '@kbn/core-root-server-internal';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';

const POLL_INTERVAL = 10_000;
const LOCAL_WRITE_BOUND = 2_000;
const CONFIG_ID = stripVersionQualifier(
  Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const record = <T>(value$: Observable<T>) => {
  const values: T[] = [];
  let completed = false;
  const subscription: Subscription = value$.subscribe({
    next: (value) => values.push(value),
    complete: () => {
      completed = true;
    },
  });
  const waitForCount = async (count: number, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (values.length < count) {
      if (Date.now() > deadline) {
        throw new Error(`Expected ${count} values within ${timeoutMs}ms, got ${values}`);
      }
      await sleep(50);
    }
    return values;
  };
  return { values, subscription, waitForCount, isCompleted: () => completed };
};

describe('IUiSettingsClient.get$ across two Kibana nodes', () => {
  let esServer: TestElasticsearchUtils;
  let kbnA: TestKibanaUtils;
  let rootB: Root | undefined;
  let startB: InternalCoreStart;
  const subscriptions: Subscription[] = [];

  const clients = (start: InternalCoreStart) => {
    const soClient = start.savedObjects.getUnsafeInternalClient();
    const spaceSoClient = savedObjectsClientMock.create();
    spaceSoClient.getCurrentNamespace.mockReturnValue('space-a');
    return {
      space: start.uiSettings.asScopedToClient(soClient),
      global: start.uiSettings.globalAsScopedToClient(soClient),
      spaceA: start.uiSettings.asScopedToClient(spaceSoClient),
    };
  };

  const watch = (client: IUiSettingsClient, key: string) => {
    const recorder = record(client.get$<string>(key));
    subscriptions.push(recorder.subscription);
    return recorder;
  };

  beforeAll(async () => {
    const servers = createTestServers({ adjustTimeout: (t) => jest.setTimeout(t) });
    esServer = await servers.startES();
    kbnA = await servers.startKibana();
    rootB = createRootWithCorePlugins({ server: { port: 5633 } });
    await rootB.preboot();
    const setupB = await rootB.setup();
    startB = await rootB.start();
    for (const { uiSettings } of [kbnA.coreSetup, setupB]) {
      uiSettings.register({ 'getobs:foo': { value: 'default', schema: schema.string() } });
      uiSettings.registerGlobal({ 'getobs:global': { value: 'default', schema: schema.string() } });
    }
  });

  afterAll(async () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    await rootB?.shutdown();
    await kbnA?.stop();
    await esServer?.stop();
  });

  it('emits a write on this node right away and on the other node within one poll', async () => {
    const a = clients(kbnA.coreStart);
    const b = clients(startB);
    const onA = watch(a.space, 'getobs:foo');
    const onB = watch(b.space, 'getobs:foo');
    expect(await onA.waitForCount(1, POLL_INTERVAL)).toEqual(['default']);
    expect(await onB.waitForCount(1, POLL_INTERVAL)).toEqual(['default']);

    await a.space.set('getobs:foo', 'from-a');

    expect(await onA.waitForCount(2, LOCAL_WRITE_BOUND)).toEqual(['default', 'from-a']);
    expect(await onB.waitForCount(2, POLL_INTERVAL + 2_000)).toEqual(['default', 'from-a']);
  });

  it('does not emit for a write that keeps the value, and emits the default after remove', async () => {
    const a = clients(kbnA.coreStart);
    const b = clients(startB);
    const onA = watch(a.space, 'getobs:foo');
    const onB = watch(b.space, 'getobs:foo');
    await onA.waitForCount(1, POLL_INTERVAL);
    await onB.waitForCount(1, POLL_INTERVAL);

    await a.space.set('getobs:foo', 'from-a');
    await sleep(LOCAL_WRITE_BOUND);
    expect(onA.values).toEqual(['from-a']);

    await a.space.remove('getobs:foo');

    expect(await onA.waitForCount(2, LOCAL_WRITE_BOUND)).toEqual(['from-a', 'default']);
    expect(await onB.waitForCount(2, POLL_INTERVAL + 2_000)).toEqual(['from-a', 'default']);
  });

  it('observes global settings, and the other node pull reads converge with the stream', async () => {
    const a = clients(kbnA.coreStart);
    const b = clients(startB);
    const onB = watch(b.global, 'getobs:global');
    expect(await onB.waitForCount(1, POLL_INTERVAL)).toEqual(['default']);
    expect(await b.global.get('getobs:global')).toBe('default');

    await a.global.set('getobs:global', 'global-from-a');

    expect(await onB.waitForCount(2, POLL_INTERVAL + 2_000)).toEqual(['default', 'global-from-a']);
    expect(await b.global.get('getobs:global')).toBe('global-from-a');
  });

  it('reads a non-default space from its own namespace', async () => {
    const a = clients(kbnA.coreStart);
    const b = clients(startB);
    await a.space.set('getobs:foo', 'in-default-space');

    const onB = watch(b.spaceA, 'getobs:foo');
    expect(await onB.waitForCount(1, POLL_INTERVAL)).toEqual(['default']);

    await kbnA.coreStart.savedObjects
      .createInternalRepository()
      .create(
        'config',
        { buildNum: 1, 'getobs:foo': 'in-space-a' },
        { id: CONFIG_ID, namespace: 'space-a', overwrite: true }
      );

    expect(await onB.waitForCount(2, POLL_INTERVAL + 2_000)).toEqual(['default', 'in-space-a']);
  });

  it('completes when the node stops', async () => {
    const onB = watch(clients(startB).space, 'getobs:foo');
    await onB.waitForCount(1, POLL_INTERVAL);

    await rootB?.shutdown();
    rootB = undefined;

    expect(onB.isCompleted()).toBe(true);
  });
});
