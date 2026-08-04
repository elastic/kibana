/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { Root } from '@kbn/core-root-server-internal';
import type { LazyInitContext } from '@kbn/core-plugins-server';
import { DeferredInitEngine } from '@kbn/core-plugins-server-internal';
import { DEFERRED_INIT_STATE_TYPE } from '@kbn/core-deferred-init-common';

/**
 * Attributes stored on the cluster-global deferred-init state doc. Kept local to the test so it
 * asserts against the real persisted shape rather than importing the (internal) source type.
 */
interface StateDocAttributes {
  status: 'available' | 'failed';
  updatedAt: string;
  attempts: number;
  kibanaVersion: string;
  lastError?: string;
}

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
});

/**
 * A `DeferredInitEngine` holds no cross-instance state except the shared SO doc it reads/writes in
 * Elasticsearch, so two engine objects backed by the same booted Kibana (each with its own internal
 * repository, exactly as `PluginsSystem` builds them) faithfully simulate two Kibana instances
 * behind a load balancer — no second process required.
 *
 * These tests guard the cross-instance caching layer end to end: they only pass if the internal
 * repository can actually reach the hidden `core-deferred-init-state` type. If the repository is
 * ever created without `includedHiddenTypes` again, reads silently return `undefined` and writes
 * are swallowed, and every assertion here fails.
 */
describe('DeferredInitEngine cross-instance state (integration)', () => {
  let esServer: TestElasticsearchUtils;
  let root: Root;
  let start: InternalCoreStart;

  const KIBANA_VERSION = '1.2.3';

  const createContext = (): LazyInitContext => ({
    elasticsearch: { client: start.elasticsearch.client.asInternalUser },
    // Mirrors how `PluginsSystem` builds the lazy-init context, including the hidden state type.
    savedObjects: start.savedObjects.createInternalRepository([DEFERRED_INIT_STATE_TYPE]),
    logger: loggerMock.create(),
  });

  const createEngine = (version: string = KIBANA_VERSION): DeferredInitEngine =>
    new DeferredInitEngine(loggerMock.create(), version);

  const readStateDoc = (pluginId: string) =>
    start.savedObjects
      .createInternalRepository([DEFERRED_INIT_STATE_TYPE])
      .get<StateDocAttributes>(DEFERRED_INIT_STATE_TYPE, pluginId);

  beforeAll(async () => {
    esServer = await startES();
    root = createRootWithCorePlugins();
    await root.preboot();
    await root.setup();
    start = await root.start();
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('persists the shared state doc so a second engine instance reads it back', async () => {
    const pluginId = 'intgDeferredInitPersist';
    const engine = createEngine();
    const runner = jest.fn(async (_ctx: LazyInitContext) => {});

    engine.setRunner(pluginId, runner, createContext());
    await engine.trigger(pluginId);

    expect(engine.getState(pluginId)).toBe('available');
    expect(runner).toHaveBeenCalledTimes(1);

    // The doc is really in ES, readable through a fresh internal repository, with the attributes
    // `writeDeferredInitOutcome` recorded.
    const doc = await readStateDoc(pluginId);
    expect(doc.attributes).toEqual(
      expect.objectContaining({
        status: 'available',
        kibanaVersion: KIBANA_VERSION,
        attempts: 1,
      })
    );
  });

  it('lets a warm instance adopt `available` without running its own runner', async () => {
    const pluginId = 'intgDeferredInitWarm';

    const engineA = createEngine();
    const runnerA = jest.fn(async (_ctx: LazyInitContext) => {});
    engineA.setRunner(pluginId, runnerA, createContext());
    await engineA.trigger(pluginId);
    expect(runnerA).toHaveBeenCalledTimes(1);

    // A second instance reads the shared doc and skips the runner entirely (the fast path that the
    // missing `includedHiddenTypes` used to silently disable).
    const engineB = createEngine();
    const runnerB = jest.fn(async (_ctx: LazyInitContext) => {});
    engineB.setRunner(pluginId, runnerB, createContext());
    await engineB.trigger(pluginId);

    expect(engineB.getState(pluginId)).toBe('available');
    expect(runnerB).not.toHaveBeenCalled();
  });

  it('re-runs when the stored state was written by a different Kibana version', async () => {
    const pluginId = 'intgDeferredInitUpgrade';

    const engineOld = createEngine('8.0.0');
    const runnerOld = jest.fn(async (_ctx: LazyInitContext) => {});
    engineOld.setRunner(pluginId, runnerOld, createContext());
    await engineOld.trigger(pluginId);
    expect(runnerOld).toHaveBeenCalledTimes(1);

    // A newer version must not trust the stale `available`: it re-runs and rewrites the doc.
    const engineNew = createEngine('9.0.0');
    const runnerNew = jest.fn(async (_ctx: LazyInitContext) => {});
    engineNew.setRunner(pluginId, runnerNew, createContext());
    await engineNew.trigger(pluginId);

    expect(engineNew.getState(pluginId)).toBe('available');
    expect(runnerNew).toHaveBeenCalledTimes(1);

    const doc = await readStateDoc(pluginId);
    expect(doc.attributes.kibanaVersion).toBe('9.0.0');
  });
});
