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

  test('requires the migration flag when the standalone embeddable flag is enabled', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddable = createEmbeddableSetupMock();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    plugin.setup(coreSetup, { embeddable });

    const migration = embeddable.registerPanelTypeMigration.mock.calls[0][0] as PanelTypeMigration;
    const flag$ = new BehaviorSubject<boolean>(LEGACY_VEGA_PANEL_MIGRATION_DEFAULT);
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());

    plugin.start(coreStart);
    await new Promise(process.nextTick);

    const savedObjectsClient = savedObjectsClientMock.create();
    const panel = {
      id: '1',
      config: { savedVis: { type: 'vega', params: { spec: '{a: 1}' } } },
    };
    const result = await migration.migrateOut([panel], { savedObjectsClient });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();

    flag$.next(true);
    const resultEnabled = await migration.migrateOut([panel], { savedObjectsClient });
    expect(resultEnabled).toEqual([
      {
        panelId: '1',
        config: { spec: { format: 'hjson', value: '{a: 1}' } },
      },
    ]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('requires the standalone embeddable flag when the migration flag is enabled', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddable = createEmbeddableSetupMock();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(false);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    plugin.setup(coreSetup, { embeddable });

    const migration = embeddable.registerPanelTypeMigration.mock.calls[0][0];
    const flag$ = new BehaviorSubject<boolean>(true);
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);
    await new Promise(process.nextTick);

    const savedObjectsClient = savedObjectsClientMock.create();
    const result = await migration.migrateOut(
      [
        {
          id: '1',
          config: { savedVis: { type: 'vega', params: { spec: '{a: 1}' } } },
        },
      ],
      { savedObjectsClient }
    );

    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('migrates by-value legacy Vega panels when both flags are enabled', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = embeddableSetup.registerPanelTypeMigration.mock.calls[0][0];

    const flag$ = new BehaviorSubject<boolean>(false);
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);

    flag$.next(true);
    await new Promise(process.nextTick);

    const savedObjectsClient = savedObjectsClientMock.create();

    const result = await migration.migrateOut(
      [
        {
          id: '1',
          config: {
            title: 'My panel',
            hide_border: true,
            savedVis: { type: 'vega', params: { spec: '{a: 1}' } },
          },
        },
      ],
      { savedObjectsClient }
    );

    expect(result).toEqual([
      {
        panelId: '1',
        config: {
          title: 'My panel',
          hide_border: true,
          spec: { format: 'hjson', value: '{a: 1}' },
        },
      },
    ]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('preserves strict JSON specs as JSON', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = embeddableSetup.registerPanelTypeMigration.mock.calls[0][0];

    const flag$ = new BehaviorSubject<boolean>(true);
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);
    await new Promise(process.nextTick);

    const savedObjectsClient = savedObjectsClientMock.create();
    const result = await migration.migrateOut(
      [
        {
          id: 'json',
          config: { savedVis: { type: 'vega', params: { spec: '{"mark":"point"}' } } },
        },
      ],
      { savedObjectsClient }
    );

    expect(result).toEqual([
      {
        panelId: 'json',
        config: { spec: { format: 'json', value: { mark: 'point' } } },
      },
    ]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('omits non-Vega legacy visualizations', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = embeddableSetup.registerPanelTypeMigration.mock.calls[0][0];

    const flag$ = new BehaviorSubject<boolean>(true);
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);
    await new Promise(process.nextTick);

    const savedObjectsClient = savedObjectsClientMock.create();

    const result = await migration.migrateOut(
      [{ id: '1', config: { savedVis: { type: 'pie', params: {} } } }],
      { savedObjectsClient }
    );

    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('does not migrate by-reference legacy visualization panels', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = embeddableSetup.registerPanelTypeMigration.mock.calls[0][0];

    const flag$ = new BehaviorSubject<boolean>(true);
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);
    await new Promise(process.nextTick);

    const savedObjectsClient = savedObjectsClientMock.create();
    const result = await migration.migrateOut(
      [{ id: 'by-reference', config: { savedObjectId: 'vis-1' } }],
      { savedObjectsClient }
    );

    expect(result).toEqual([]);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('does not migrate hybrid by-reference and by-value legacy visualization panels', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = embeddableSetup.registerPanelTypeMigration.mock.calls[0][0];

    const flag$ = new BehaviorSubject<boolean>(true);
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);
    await new Promise(process.nextTick);

    const savedObjectsClient = savedObjectsClientMock.create();
    const result = await migration.migrateOut(
      [
        {
          id: 'hybrid',
          config: {
            savedObjectId: 'vis-1',
            savedVis: { type: 'vega', params: { spec: '{a: 1}' } },
          },
        },
      ],
      { savedObjectsClient }
    );

    expect(result).toEqual([]);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('returns per-panel errors for missing spec', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = embeddableSetup.registerPanelTypeMigration.mock.calls[0][0];

    const flag$ = new BehaviorSubject<boolean>(true);
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);
    await new Promise(process.nextTick);

    const savedObjectsClient = savedObjectsClientMock.create();

    const result = await migration.migrateOut(
      [
        { id: 'by-value', config: { savedVis: { type: 'vega', params: {} } } },
        { id: 'by-ref', config: { savedObjectId: 'vis-1' } },
      ],
      { savedObjectsClient }
    );

    expect(result).toHaveLength(1);
    expect(result.map((r) => r.panelId)).toEqual(['by-value']);
    expect('error' in result[0]).toBe(true);
    if ('error' in result[0]) {
      expect(result[0].error.message).toBe('By-value Vega visualization is missing spec');
    }
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
