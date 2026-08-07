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
    const result = await migration.migrateOut([{ id: '1', config: { savedObjectId: 'vis-1' } }], {
      savedObjectsClient,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();

    flag$.next(true);
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'vis-1',
          type: 'visualization',
          attributes: {
            visState: JSON.stringify({ type: 'vega', params: { spec: '{foo: 1}' } }),
          },
        },
      ],
    });

    const resultEnabled = await migration.migrateOut(
      [{ id: '1', config: { savedObjectId: 'vis-1', title: 't' } }],
      { savedObjectsClient }
    );
    expect(resultEnabled).toEqual([{ panelId: '1', config: { title: 't', spec: '{foo: 1}' } }]);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
  });

  test('migrates by-value legacy Vega panels when enabled', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = (embeddableSetup.registerPanelTypeMigration as jest.Mock).mock
      .calls[0][0] as PanelTypeMigration;

    const flag$ = new BehaviorSubject<boolean>(false);
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);

    flag$.next(true);

    const savedObjectsClient = {
      bulkGet: jest.fn(),
    } as any;

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
      { panelId: '1', config: { title: 'My panel', hide_border: true, spec: '{a: 1}' } },
    ]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('omits non-Vega legacy visualizations', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = (embeddableSetup.registerPanelTypeMigration as jest.Mock).mock
      .calls[0][0] as PanelTypeMigration;

    const flag$ = new BehaviorSubject<boolean>(true);
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);

    const savedObjectsClient = {
      bulkGet: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: 'vis-1',
            type: 'visualization',
            attributes: {
              visState: JSON.stringify({ type: 'pie', params: {} }),
            },
          },
        ],
      }),
    } as any;

    const result = await migration.migrateOut(
      [
        { id: '1', config: { savedVis: { type: 'pie', params: {} } } },
        { id: '2', config: { savedObjectId: 'vis-1' } },
      ],
      { savedObjectsClient }
    );

    expect(result).toEqual([]);
  });

  test('migrates by-reference legacy Vega panels with one bulkGet', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = (embeddableSetup.registerPanelTypeMigration as jest.Mock).mock
      .calls[0][0] as PanelTypeMigration;

    const flag$ = new BehaviorSubject<boolean>(true);
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);

    const savedObjectsClient = {
      bulkGet: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: 'vis-a',
            type: 'visualization',
            attributes: {
              visState: JSON.stringify({ type: 'vega', params: { spec: '{a: 1}' } }),
            },
          },
          {
            id: 'vis-b',
            type: 'visualization',
            attributes: {
              visState: JSON.stringify({ type: 'vega', params: { spec: '{b: 2}' } }),
            },
          },
        ],
      }),
    } as any;

    const result = await migration.migrateOut(
      [
        { id: 'panel-a', config: { savedObjectId: 'vis-a', title: 'A' } },
        { id: 'panel-b', config: { savedObjectId: 'vis-b', hide_title: true } },
      ],
      { savedObjectsClient }
    );

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      { panelId: 'panel-a', config: { title: 'A', spec: '{a: 1}' } },
      { panelId: 'panel-b', config: { hide_title: true, spec: '{b: 2}' } },
    ]);
  });

  test('returns a per-panel error when referenced visualization visState cannot be parsed', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = (embeddableSetup.registerPanelTypeMigration as jest.Mock).mock
      .calls[0][0] as PanelTypeMigration;

    const flag$ = new BehaviorSubject<boolean>(true);
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);

    const savedObjectsClient = {
      bulkGet: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: 'vis-bad',
            type: 'visualization',
            attributes: {
              visState: '{not-json',
            },
          },
        ],
      }),
    } as any;

    const result = await migration.migrateOut(
      [{ id: 'panel-1', config: { savedObjectId: 'vis-bad' } }],
      { savedObjectsClient }
    );

    expect(result).toHaveLength(1);
    expect((result[0] as any).panelId).toBe('panel-1');
    expect((result[0] as any).error.message).toContain(
      'Unable to parse visualization "vis-bad" visState'
    );
  });

  test('returns per-panel errors for missing spec and for bulkGet errors', async () => {
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const embeddableSetup = createEmbeddableSetupMock();

    plugin.setup(coreSetup, { embeddable: embeddableSetup });

    const migration = (embeddableSetup.registerPanelTypeMigration as jest.Mock).mock
      .calls[0][0] as PanelTypeMigration;

    const flag$ = new BehaviorSubject<boolean>(true);
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$.asObservable());
    plugin.start(coreStart);

    const savedObjectsClient = {
      bulkGet: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: 'vis-missing',
            type: 'visualization',
            error: { statusCode: 404, message: 'not found' },
          },
          {
            id: 'vis-bad',
            type: 'visualization',
            attributes: {
              visState: JSON.stringify({ type: 'vega', params: {} }),
            },
          },
        ],
      }),
    } as any;

    const result = await migration.migrateOut(
      [
        { id: 'by-value', config: { savedVis: { type: 'vega', params: {} } } },
        { id: 'missing', config: { savedObjectId: 'vis-missing' } },
        { id: 'bad', config: { savedObjectId: 'vis-bad' } },
      ],
      { savedObjectsClient }
    );

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.panelId)).toEqual(['by-value', 'missing', 'bad']);
    expect((result[0] as any).error.message).toBe('By-value Vega visualization is missing spec');
    expect((result[1] as any).error.message).toBe('not found');
    expect((result[2] as any).error.message).toBe('Visualization "vis-bad" is missing Vega spec');
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
