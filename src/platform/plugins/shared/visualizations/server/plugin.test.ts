/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import { VisualizationsPlugin } from './plugin';

describe('VisualizationsPlugin', () => {
  test('registers a legacy_vis panel type migration that runs the registered vis type migrations', () => {
    const embeddable = createEmbeddableSetupMock();
    const { registerLegacyPanelMigration } = new VisualizationsPlugin(
      coreMock.createPluginInitializerContext()
    ).setup(coreMock.createSetup(), {
      embeddable,
      data: dataPluginMock.createSetupContract() as never,
      contentManagement: { register: jest.fn() } as never,
    });
    registerLegacyPanelMigration('vega', { to: 'vega', migrate: () => ({ spec: 'migrated' }) });

    const [[{ from, migrateOut }]] = embeddable.registerPanelTypeMigration.mock.calls;
    expect(from).toBe(VISUALIZE_EMBEDDABLE_TYPE);
    expect(
      migrateOut([
        {
          id: 'panel-1',
          config: {
            savedVis: {
              title: 'Vega',
              type: 'vega',
              params: {},
              data: { aggs: [], searchSource: {} },
            },
          },
        },
      ])
    ).toEqual([{ panelId: 'panel-1', type: 'vega', config: { spec: 'migrated' } }]);
  });
});
