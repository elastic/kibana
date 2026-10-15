/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SerializedVis } from '../../common';
import { getLegacyVisPanelTypeMigration } from './migrate_out';
import { getLegacyPanelMigrationRegistry } from './registry';

const getSavedVis = (type: string): SerializedVis => ({
  title: `${type} vis`,
  type,
  params: {},
  data: { aggs: [], searchSource: {} },
});

describe('legacy_vis panel type migration', () => {
  const context = { savedObjectsClient: savedObjectsClientMock.create() };
  const migrate = jest.fn();
  const registry = getLegacyPanelMigrationRegistry();
  registry.registerLegacyPanelMigration('vega', { to: 'vega', migrate });
  const { migrateOut } = getLegacyVisPanelTypeMigration(registry.getLegacyPanelMigration);

  beforeEach(() => {
    migrate.mockReset();
    migrate.mockReturnValue({ spec: 'migrated' });
  });

  test('migrates a by-value panel with the handler for its vis type', async () => {
    const savedVis = getSavedVis('vega');

    expect(
      await migrateOut(
        [
          {
            id: 'panel-1',
            config: {
              title: 'Panel title',
              hide_border: true,
              time_range: { from: 'now-15m', to: 'now' },
              uiState: {},
              savedVis,
            },
          },
        ],
        context
      )
    ).toEqual([{ panelId: 'panel-1', type: 'vega', config: { spec: 'migrated' } }]);
    expect(migrate).toHaveBeenCalledWith({
      savedVis,
      panelConfig: {
        title: 'Panel title',
        hide_border: true,
        time_range: { from: 'now-15m', to: 'now' },
      },
    });
  });

  test('leaves a by-reference panel unchanged', async () => {
    expect(
      await migrateOut(
        [{ id: 'panel-1', config: { savedObjectId: 'vis-id', savedVis: getSavedVis('vega') } }],
        context
      )
    ).toEqual([]);
    expect(migrate).not.toHaveBeenCalled();
  });

  test('migrates only the by-value panels in a mixed batch', async () => {
    expect(
      await migrateOut(
        [
          { id: 'by-value', config: { savedVis: getSavedVis('vega') } },
          { id: 'by-reference', config: { savedObjectId: 'vis-id' } },
          { id: 'other-type', config: { savedVis: getSavedVis('pie') } },
        ],
        context
      )
    ).toEqual([{ panelId: 'by-value', type: 'vega', config: { spec: 'migrated' } }]);
  });

  test('leaves a panel unchanged when its vis type has no handler', async () => {
    expect(
      await migrateOut([{ id: 'panel-1', config: { savedVis: getSavedVis('pie') } }], context)
    ).toEqual([]);
  });

  test('leaves a panel unchanged when the handler returns undefined', async () => {
    migrate.mockReturnValue(undefined);

    expect(
      await migrateOut([{ id: 'panel-1', config: { savedVis: getSavedVis('vega') } }], context)
    ).toEqual([]);
  });

  test('returns an error result when the handler throws', async () => {
    const error = new Error('Invalid spec');
    migrate.mockImplementation(() => {
      throw error;
    });

    expect(
      await migrateOut([{ id: 'panel-1', config: { savedVis: getSavedVis('vega') } }], context)
    ).toEqual([{ panelId: 'panel-1', error }]);
  });
});
