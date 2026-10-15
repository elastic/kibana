/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { SerializedVis } from '@kbn/visualizations-plugin/common';
import { migrateLegacyVegaPanel } from './migrate';

const getSavedVis = ({
  spec = '{ mark: point }',
  searchSource = {},
}: {
  spec?: unknown;
  searchSource?: SerializedVis['data']['searchSource'];
} = {}): SerializedVis => ({
  title: 'Legacy Vega',
  description: 'Legacy description',
  type: 'vega',
  params: { spec },
  data: { aggs: [], searchSource },
});

describe('migrateLegacyVegaPanel', () => {
  test('keeps panel settings and an HJSON spec as text', () => {
    expect(
      migrateLegacyVegaPanel({
        savedVis: getSavedVis(),
        panelConfig: {
          title: 'Panel title',
          description: 'Panel description',
          hide_title: true,
          hide_border: true,
          time_range: { from: 'now-15m', to: 'now' },
          drilldowns: [{ label: 'Go', trigger: 'on_open_panel_menu', type: 'url_drilldown' }],
        },
      })
    ).toEqual({
      title: 'Panel title',
      description: 'Panel description',
      hide_title: true,
      hide_border: true,
      time_range: { from: 'now-15m', to: 'now' },
      drilldowns: [{ label: 'Go', trigger: 'on_open_panel_menu', type: 'url_drilldown' }],
      spec: { format: 'hjson', value: '{ mark: point }' },
    });
  });

  test('falls back to the visualization title and description', () => {
    expect(migrateLegacyVegaPanel({ savedVis: getSavedVis(), panelConfig: {} })).toEqual({
      title: 'Legacy Vega',
      description: 'Legacy description',
      spec: { format: 'hjson', value: '{ mark: point }' },
    });
  });

  test('converts a strict JSON object spec to a JSON spec', () => {
    expect(
      migrateLegacyVegaPanel({
        savedVis: getSavedVis({ spec: '{"mark":"point"}' }),
        panelConfig: {},
      }).spec
    ).toEqual({ format: 'json', value: { mark: 'point' } });
  });

  test('keeps a JSON spec that is not an object as HJSON', () => {
    expect(
      migrateLegacyVegaPanel({ savedVis: getSavedVis({ spec: '[1, 2]' }), panelConfig: {} }).spec
    ).toEqual({ format: 'hjson', value: '[1, 2]' });
  });

  test('converts the visualization query and filters', () => {
    const filter: Filter = {
      meta: {
        index: 'logs-data-view',
        key: 'host.name',
        params: { query: 'web-1' },
        type: 'phrase',
      },
      query: { match_phrase: { 'host.name': 'web-1' } },
    };

    const { query, filters } = migrateLegacyVegaPanel({
      savedVis: getSavedVis({
        searchSource: { query: { query: 'status:200', language: 'lucene' }, filter: [filter] },
      }),
      panelConfig: {},
    });

    expect(query).toEqual({ expression: 'status:200', language: 'lucene' });
    expect(filters).toHaveLength(1);
    expect(filters![0]).toMatchObject({ data_view_id: 'logs-data-view' });
  });

  test('omits an empty query, empty filters, and ES|QL queries', () => {
    const state = migrateLegacyVegaPanel({
      savedVis: getSavedVis({
        searchSource: { query: { query: '', language: 'kuery' }, filter: [] },
      }),
      panelConfig: {},
    });
    expect(state).not.toHaveProperty('query');
    expect(state).not.toHaveProperty('filters');

    expect(
      migrateLegacyVegaPanel({
        savedVis: getSavedVis({ searchSource: { query: { esql: 'FROM logs' } } }),
        panelConfig: {},
      })
    ).not.toHaveProperty('query');
  });

  test('throws when the visualization has no spec', () => {
    expect(() =>
      migrateLegacyVegaPanel({ savedVis: { ...getSavedVis(), params: {} }, panelConfig: {} })
    ).toThrow('By-value Vega visualization is missing spec');
  });
});
