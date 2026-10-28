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
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectsSpacesExtension } from '@kbn/core-saved-objects-server';
import { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';

const CROSS_NODE_TIMEOUT = 25_000;
const CONFIG_ID = stripVersionQualifier(
  Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version
);
const SPACE_ID = 'space-a';

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
        throw new Error(
          `Expected ${count} values within ${timeoutMs}ms, got ${JSON.stringify(values)}`
        );
      }
      await sleep(50);
    }
    return values;
  };
  return { values, subscription, waitForCount, isCompleted: () => completed };
};

const spacesExtensionFor = (namespace: string): ISavedObjectsSpacesExtension => ({
  getCurrentNamespace: () => namespace,
  getSearchableNamespaces: async (namespaces) => namespaces ?? [namespace],
  asScopedToNamespace: (nextNamespace) => spacesExtensionFor(nextNamespace),
});

const clientForNamespace = (start: InternalCoreStart, namespace: string): IUiSettingsClient => {
  const repository = start.savedObjects.createInternalRepository(undefined, {
    spacesExtension: spacesExtensionFor(namespace),
  });
  const savedObjectsClient: SavedObjectsClientContract = new SavedObjectsClient(repository);
  return start.uiSettings.asScopedToClient(savedObjectsClient);
};

describe('IUiSettingsClient.get$ across two Kibana nodes', () => {
  let esServer: TestElasticsearchUtils;
  let kbnA: TestKibanaUtils;
  let rootB: Root | undefined;
  let startB: InternalCoreStart;
  const subscriptions: Subscription[] = [];

  const stringSetting = (value: string) => ({ value, schema: schema.string() });

  const clients = (start: InternalCoreStart) => {
    const savedObjectsClient = start.savedObjects.getUnsafeInternalClient();
    return {
      space: start.uiSettings.asScopedToClient(savedObjectsClient),
      global: start.uiSettings.globalAsScopedToClient(savedObjectsClient),
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
    rootB = createRootWithCorePlugins({ server: { port: 0 } });
    await rootB.preboot();
    const setupB = await rootB.setup();
    startB = await rootB.start();

    const namespaced = {
      'getobs:cross': stringSetting('default'),
      'getobs:local': stringSetting('default'),
      'getobs:same': stringSetting('default'),
      'getobs:other': stringSetting('default'),
      'getobs:remove': stringSetting('default'),
      'getobs:space': stringSetting('default'),
    };
    const global = {
      'getobs:global': stringSetting('default'),
    };
    for (const { uiSettings } of [kbnA.coreSetup, setupB]) {
      uiSettings.register(namespaced);
      uiSettings.registerGlobal(global);
    }
  });

  afterAll(async () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    await rootB?.shutdown();
    await kbnA?.stop();
    await esServer?.stop();
  });

  it('delivers a write on node A to a subscriber on node B', async () => {
    const writer = clients(kbnA.coreStart).space;
    const onB = watch(clients(startB).space, 'getobs:cross');
    expect(await onB.waitForCount(1, CROSS_NODE_TIMEOUT)).toEqual(['default']);

    await writer.set('getobs:cross', 'from-a');

    expect(await onB.waitForCount(2, CROSS_NODE_TIMEOUT)).toEqual(['default', 'from-a']);
  });

  it('delivers a local set to a subscriber on the same node', async () => {
    const local = clients(kbnA.coreStart).space;
    const onA = watch(local, 'getobs:local');
    expect(await onA.waitForCount(1, CROSS_NODE_TIMEOUT)).toEqual(['default']);

    await local.set('getobs:local', 'from-local');

    expect(await onA.waitForCount(2, CROSS_NODE_TIMEOUT)).toEqual(['default', 'from-local']);
  });

  it('does not emit when a write keeps the same value', async () => {
    const local = clients(kbnA.coreStart).space;
    const onSame = watch(local, 'getobs:same');
    const onOther = watch(local, 'getobs:other');
    expect(await onSame.waitForCount(1, CROSS_NODE_TIMEOUT)).toEqual(['default']);
    expect(await onOther.waitForCount(1, CROSS_NODE_TIMEOUT)).toEqual(['default']);

    await local.set('getobs:same', 'stable');
    expect(await onSame.waitForCount(2, CROSS_NODE_TIMEOUT)).toEqual(['default', 'stable']);

    await local.set('getobs:same', 'stable');
    await local.set('getobs:other', 'changed');

    expect(await onOther.waitForCount(2, CROSS_NODE_TIMEOUT)).toEqual(['default', 'changed']);
    expect(onSame.values).toEqual(['default', 'stable']);
  });

  it('emits the default after remove', async () => {
    const local = clients(kbnA.coreStart).space;
    const onA = watch(local, 'getobs:remove');
    expect(await onA.waitForCount(1, CROSS_NODE_TIMEOUT)).toEqual(['default']);

    await local.set('getobs:remove', 'custom');
    expect(await onA.waitForCount(2, CROSS_NODE_TIMEOUT)).toEqual(['default', 'custom']);

    await local.remove('getobs:remove');

    expect(await onA.waitForCount(3, CROSS_NODE_TIMEOUT)).toEqual(['default', 'custom', 'default']);
  });

  it('observes a global setting written on the other node', async () => {
    const onB = watch(clients(startB).global, 'getobs:global');
    expect(await onB.waitForCount(1, CROSS_NODE_TIMEOUT)).toEqual(['default']);

    await clients(kbnA.coreStart).global.set('getobs:global', 'global-from-a');

    expect(await onB.waitForCount(2, CROSS_NODE_TIMEOUT)).toEqual(['default', 'global-from-a']);
  });

  it('reads a non-default space from that namespace', async () => {
    const onDefault = watch(clients(startB).space, 'getobs:space');
    const onSpace = watch(clientForNamespace(startB, SPACE_ID), 'getobs:space');
    expect(await onDefault.waitForCount(1, CROSS_NODE_TIMEOUT)).toEqual(['default']);
    expect(await onSpace.waitForCount(1, CROSS_NODE_TIMEOUT)).toEqual(['default']);

    await kbnA.coreStart.savedObjects
      .createInternalRepository()
      .create(
        'config',
        { buildNum: 1, 'getobs:space': 'in-space-a' },
        { id: CONFIG_ID, namespace: SPACE_ID, overwrite: true }
      );

    expect(await onSpace.waitForCount(2, CROSS_NODE_TIMEOUT)).toEqual(['default', 'in-space-a']);
    expect(onDefault.values).toEqual(['default']);
  });

  it('completes when the node stops', async () => {
    const onB = watch(clients(startB).space, 'getobs:cross');
    await onB.waitForCount(1, CROSS_NODE_TIMEOUT);

    await rootB?.shutdown();
    rootB = undefined;

    const deadline = Date.now() + 5_000;
    while (!onB.isCompleted() && Date.now() < deadline) {
      await sleep(50);
    }
    expect(onB.isCompleted()).toBe(true);
  });
});
