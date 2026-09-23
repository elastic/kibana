/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
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
  const plugins: VisTypeVegaPlugin[] = [];

  const setupPlugin = async ({
    standaloneEmbeddableEnabled = false,
    legacyVegaMigrationEnabled = LEGACY_VEGA_PANEL_MIGRATION_DEFAULT,
  } = {}) => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const embeddable = createEmbeddableSetupMock();
    const migrationFlag$ = new BehaviorSubject(legacyVegaMigrationEnabled);

    coreStart.featureFlags.getBooleanValue.mockImplementation(async (key, fallback) =>
      key === VEGA_STANDALONE_EMBEDDABLE_FLAG ? standaloneEmbeddableEnabled : fallback
    );
    coreStart.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(migrationFlag$);
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    const plugin = new VisTypeVegaPlugin(initializerContext);
    plugins.push(plugin);
    plugin.setup(coreSetup, { embeddable });
    plugin.start(coreStart);
    await new Promise(process.nextTick);

    return { coreStart, embeddable, migrationFlag$ };
  };

  afterEach(() => {
    plugins.splice(0).forEach((plugin) => plugin.stop());
  });

  test('registers a server definition for vega', async () => {
    const { embeddable } = await setupPlugin();

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledTimes(1);
    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      VEGA_EMBEDDABLE_TYPE,
      expect.any(Object)
    );
  });

  test('does not expose a schema when vega.standaloneEmbeddable is disabled', async () => {
    const { embeddable } = await setupPlugin();

    const [, serverDefinition] = embeddable.registerEmbeddableServerDefinition.mock.calls[0];
    expect(serverDefinition.getSchema(mockGetDrilldownsSchema)).toBeUndefined();
  });

  test('exposes a schema when vega.standaloneEmbeddable is enabled', async () => {
    const { embeddable } = await setupPlugin({ standaloneEmbeddableEnabled: true });

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

  test('registers a legacy_vis to vega migration', async () => {
    const { embeddable } = await setupPlugin();

    expect(embeddable.registerPanelTypeMigration).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'legacy_vis', to: 'vega', migrateOut: expect.any(Function) })
    );
  });

  test('requires the migration flag when the standalone embeddable is enabled', async () => {
    const { embeddable, migrationFlag$ } = await setupPlugin({
      standaloneEmbeddableEnabled: true,
    });
    const migration = embeddable.registerPanelTypeMigration.mock.calls[0][0] as PanelTypeMigration;
    const panel = {
      id: '1',
      config: { savedVis: { type: 'vega', params: { spec: '{a: 1}' } } },
    };

    expect(migration.migrateOut([panel])).toEqual([]);

    migrationFlag$.next(true);
    expect(migration.migrateOut([panel])).toEqual([
      {
        panelId: '1',
        config: { spec: { format: 'hjson', value: '{a: 1}' } },
      },
    ]);
  });

  test('requires the standalone embeddable when the migration flag is enabled', async () => {
    const { embeddable } = await setupPlugin({ legacyVegaMigrationEnabled: true });
    const migration = embeddable.registerPanelTypeMigration.mock.calls[0][0];

    expect(
      migration.migrateOut([
        {
          id: '1',
          config: { savedVis: { type: 'vega', params: { spec: '{a: 1}' } } },
        },
      ])
    ).toEqual([]);
  });

  test('subscribes to the migration feature flag', async () => {
    const { coreStart } = await setupPlugin();

    expect(coreStart.featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG,
      LEGACY_VEGA_PANEL_MIGRATION_DEFAULT
    );
  });
});
