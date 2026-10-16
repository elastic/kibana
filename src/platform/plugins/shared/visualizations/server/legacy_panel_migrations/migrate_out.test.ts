/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedVis } from '../../common';
import { getTransforms } from '../../common/embeddable/transforms/get_transforms';
import { getLegacyVisPanelTypeMigration } from './migrate_out';
import { getLegacyPanelMigrationRegistry } from './registry';

const getSavedVis = (type: string): SerializedVis => ({
  title: `${type} vis`,
  type,
  params: {},
  data: { aggs: [], searchSource: {} },
});

describe('legacy_vis panel type migration', () => {
  const migrate = jest.fn();
  const registry = getLegacyPanelMigrationRegistry();
  registry.registerLegacyPanelMigration('vega', { to: 'vega', migrate });
  const { migrateOut } = getLegacyVisPanelTypeMigration(registry.getLegacyPanelMigration);

  beforeEach(() => {
    migrate.mockReset();
    migrate.mockReturnValue({ spec: 'migrated' });
  });

  test('migrates a by-value panel with the handler for its vis type', () => {
    const savedVis = getSavedVis('vega');

    expect(
      migrateOut({
        title: 'Panel title',
        hide_border: true,
        time_range: { from: 'now-15m', to: 'now' },
        uiState: {},
        savedVis,
      })
    ).toEqual({ type: 'vega', config: { spec: 'migrated' } });
    expect(migrate).toHaveBeenCalledWith({
      savedVis,
      panelConfig: {
        title: 'Panel title',
        hide_border: true,
        time_range: { from: 'now-15m', to: 'now' },
      },
    });
  });

  test('migrates the by-value panel state that the legacy_vis transforms store and read back', () => {
    const { transformIn, transformOut } = getTransforms({
      transformIn: (state) => ({ state, references: [] }),
      transformOut: (state) => state,
    });
    const readBack = (state: Parameters<typeof transformIn>[0]) => {
      const stored = transformIn(state);
      return transformOut(stored.state, stored.references);
    };

    const byValueConfig = readBack({
      title: 'Panel title',
      savedVis: {
        title: 'vega vis',
        type: 'vega',
        params: {},
        data: {
          aggs: [],
          searchSource: {
            filter: [
              {
                meta: { index: 'logs-data-view', key: 'host.name', type: 'phrase' },
                query: { match_phrase: { 'host.name': 'web-1' } },
              },
            ],
          },
        },
      },
    });
    const byReferenceConfig = readBack({ title: 'By reference', savedObjectId: 'vis-id' });

    expect(migrateOut(byReferenceConfig)).toBeUndefined();
    expect(migrateOut(byValueConfig)).toEqual({ type: 'vega', config: { spec: 'migrated' } });
    expect(migrate).toHaveBeenCalledTimes(1);
    const [{ savedVis, panelConfig }] = migrate.mock.calls[0];
    expect(savedVis.data.searchSource.filter[0].meta.index).toBe('logs-data-view');
    expect(panelConfig).toEqual({ title: 'Panel title' });
  });

  test('leaves a by-reference panel unchanged', () => {
    expect(migrateOut({ savedObjectId: 'vis-id', savedVis: getSavedVis('vega') })).toBeUndefined();
    expect(migrate).not.toHaveBeenCalled();
  });

  test('leaves a panel unchanged when its vis type has no handler', () => {
    expect(migrateOut({ savedVis: getSavedVis('pie') })).toBeUndefined();
  });

  test('leaves a panel unchanged when the handler returns undefined', () => {
    migrate.mockReturnValue(undefined);

    expect(migrateOut({ savedVis: getSavedVis('vega') })).toBeUndefined();
  });

  test('throws when the handler throws', () => {
    migrate.mockImplementation(() => {
      throw new Error('Invalid spec');
    });

    expect(() => migrateOut({ savedVis: getSavedVis('vega') })).toThrow('Invalid spec');
  });
});
