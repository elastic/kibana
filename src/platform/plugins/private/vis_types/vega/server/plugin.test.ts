/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { PanelTypeMigration } from '@kbn/embeddable-plugin/server';
import {
  createEmbeddableSetupMock,
  mockGetDrilldownsSchema,
} from '@kbn/embeddable-plugin/server/mocks';
import { VisTypeVegaPlugin } from './plugin';
import { VEGA_EMBEDDABLE_TYPE, VEGA_STANDALONE_EMBEDDABLE_FLAG } from '../common/constants';
import {
  LEGACY_VEGA_PANEL_MIGRATION_DEFAULT,
  LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG,
} from './legacy_vega_panel_migration/constants';

describe('VisTypeVegaPlugin (server)', () => {
  test('registers a server definition for vega', async () => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    const embeddable = createEmbeddableSetupMock();

    const plugin = new VisTypeVegaPlugin(initializerContext);
    plugin.setup(coreSetup, { embeddable });
    await new Promise(process.nextTick);

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledTimes(1);
    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      VEGA_EMBEDDABLE_TYPE,
      expect.any(Object)
    );
  });

  test('does not expose a schema when vega.standaloneEmbeddable is disabled', async () => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockImplementation(async (key, fallback) =>
      key === VEGA_STANDALONE_EMBEDDABLE_FLAG ? false : fallback
    );
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    const embeddable = createEmbeddableSetupMock();
    const plugin = new VisTypeVegaPlugin(initializerContext);
    plugin.setup(coreSetup, { embeddable });
    await new Promise(process.nextTick);

    const [, serverDefinition] = embeddable.registerEmbeddableServerDefinition.mock.calls[0];
    expect(serverDefinition.getSchema(mockGetDrilldownsSchema)).toBeUndefined();
  });

  test('exposes a schema when vega.standaloneEmbeddable is enabled', async () => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockImplementation(async (key, fallback) =>
      key === VEGA_STANDALONE_EMBEDDABLE_FLAG ? true : fallback
    );
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    const embeddable = createEmbeddableSetupMock();
    const plugin = new VisTypeVegaPlugin(initializerContext);
    plugin.setup(coreSetup, { embeddable });
    await new Promise(process.nextTick);

    const [, serverDefinition] = embeddable.registerEmbeddableServerDefinition.mock.calls[0];
    const schema = serverDefinition.getSchema(mockGetDrilldownsSchema);
    expect(schema).toBeDefined();

    const validSpec = { format: 'hjson', value: '{ mark: point }' };
    const parsed = schema!.parse({ spec: validSpec, unknown_key: 'ignored' });
    expect(parsed.spec).toEqual(validSpec);
    expect(parsed).not.toHaveProperty('unknown_key');

    expect(() => schema!.parse({})).toThrow();
    expect(() => schema!.parse({ spec: 123 })).toThrow();
    expect(() => schema!.parse({ spec: '' })).toThrow();
    expect(() => schema!.parse({ spec: { format: 'hjson', value: '' } })).toThrow();
    expect(() => schema!.parse({ spec: { format: 'json', value: 'not-an-object' } })).toThrow();
  });

  test('registers a legacy_vis to vega migration', () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddable = createEmbeddableSetupMock();

    plugin.setup(coreSetup, { embeddable });

    expect(embeddable.registerPanelTypeMigration).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'legacy_vis', to: 'vega', migrateOut: expect.any(Function) })
    );
  });

  test('does not perform saved object reads while the feature flag is disabled', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddable = createEmbeddableSetupMock();

    plugin.setup(coreSetup, { embeddable });

    const migration = embeddable.registerPanelTypeMigration.mock.calls[0][0] as PanelTypeMigration;
    const flag$ = new BehaviorSubject<boolean>(LEGACY_VEGA_PANEL_MIGRATION_DEFAULT);
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());

    plugin.start(coreStart);

    const savedObjectsClient = savedObjectsClientMock.create();
    const result = await migration.migrateOut([{ id: '1', config: {} }], {
      savedObjectsClient,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();

    flag$.next(true);
    const resultEnabled = await migration.migrateOut([{ id: '1', config: {} }], {
      savedObjectsClient,
    });
    expect(resultEnabled).toEqual([]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('subscribes to the feature flag and cleans up on stop', () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddable = createEmbeddableSetupMock();
    plugin.setup(coreSetup, { embeddable });

    const flag$ = new BehaviorSubject<boolean>(LEGACY_VEGA_PANEL_MIGRATION_DEFAULT);
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());

    plugin.start(coreStart);

    expect(coreStart.featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG,
      LEGACY_VEGA_PANEL_MIGRATION_DEFAULT
    );
    expect(() => plugin.stop()).not.toThrow();
  });
});
