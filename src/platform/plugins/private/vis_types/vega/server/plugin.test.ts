/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import {
  createEmbeddableSetupMock,
  mockGetDrilldownsSchema,
} from '@kbn/embeddable-plugin/server/mocks';
import type { SerializedVis } from '@kbn/visualizations-plugin/common';
import { VisTypeVegaPlugin } from './plugin';
import { VEGA_EMBEDDABLE_TYPE, VEGA_STANDALONE_EMBEDDABLE_FLAG } from '../common/constants';
import { LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG } from './legacy_vega_panel_migration/constants';

describe('VisTypeVegaPlugin (server)', () => {
  const plugins: VisTypeVegaPlugin[] = [];

  const setupPlugin = async ({
    standaloneEmbeddableEnabled,
    legacyVegaPanelMigrationEnabled = false,
  }: { standaloneEmbeddableEnabled?: boolean; legacyVegaPanelMigrationEnabled?: boolean } = {}) => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const migrationFlag$ = new BehaviorSubject(legacyVegaPanelMigrationEnabled);
    coreStart.featureFlags.getBooleanValue$.mockImplementation((key, fallback) => {
      if (key === LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG) return migrationFlag$;
      if (key === VEGA_STANDALONE_EMBEDDABLE_FLAG && standaloneEmbeddableEnabled !== undefined) {
        return of(standaloneEmbeddableEnabled);
      }
      return of(fallback);
    });
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    const embeddable = createEmbeddableSetupMock();
    const visualizations = {
      registerReadOnlyVisType: jest.fn(),
      registerLegacyPanelMigration: jest.fn(),
    };

    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    plugins.push(plugin);
    plugin.setup(coreSetup, { embeddable, visualizations });
    plugin.start(coreStart);
    await new Promise(process.nextTick);

    return { coreStart, embeddable, visualizations, migrationFlag$ };
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
    const { embeddable } = await setupPlugin({ standaloneEmbeddableEnabled: false });

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

  describe('legacy Vega panel migration', () => {
    const args = {
      savedVis: {
        title: 'Legacy Vega',
        type: 'vega',
        params: { spec: '{ mark: point }' },
        data: { aggs: [], searchSource: {} },
      } as SerializedVis,
      panelConfig: {},
    };

    const getMigration = (
      visualizations: Awaited<ReturnType<typeof setupPlugin>>['visualizations']
    ) => {
      expect(visualizations.registerLegacyPanelMigration).toHaveBeenCalledWith('vega', {
        to: VEGA_EMBEDDABLE_TYPE,
        migrate: expect.any(Function),
      });
      return visualizations.registerLegacyPanelMigration.mock.calls[0][1];
    };

    test('migrates when both flags are enabled and follows the dynamic migration flag', async () => {
      const { visualizations, migrationFlag$ } = await setupPlugin({
        standaloneEmbeddableEnabled: true,
      });
      const { migrate } = getMigration(visualizations);

      expect(migrate(args)).toBeUndefined();

      migrationFlag$.next(true);
      expect(migrate(args)).toEqual({
        title: 'Legacy Vega',
        description: undefined,
        spec: { format: 'hjson', value: '{ mark: point }' },
      });
    });

    test('does not migrate when vega.standaloneEmbeddable is disabled', async () => {
      const { visualizations } = await setupPlugin({
        standaloneEmbeddableEnabled: false,
        legacyVegaPanelMigrationEnabled: true,
      });

      expect(getMigration(visualizations).migrate(args)).toBeUndefined();
    });
  });
});
