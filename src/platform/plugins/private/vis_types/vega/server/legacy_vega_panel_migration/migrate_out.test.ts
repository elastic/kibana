/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { migrateLegacyVegaPanels } from './migrate_out';

describe('migrateLegacyVegaPanels', () => {
  test('migrates a by-value Vega panel and preserves its panel settings', () => {
    expect(
      migrateLegacyVegaPanels([
        {
          id: 'vega',
          config: {
            title: 'My panel',
            hide_border: true,
            savedVis: { type: 'vega', params: { spec: '{ mark: point }' } },
          },
        },
      ])
    ).toEqual([
      {
        panelId: 'vega',
        config: {
          title: 'My panel',
          hide_border: true,
          spec: { format: 'hjson', value: '{ mark: point }' },
        },
      },
    ]);
  });

  test('preserves strict JSON specs as JSON objects', () => {
    expect(
      migrateLegacyVegaPanels([
        {
          id: 'json',
          config: { savedVis: { type: 'vega', params: { spec: '{"mark":"point"}' } } },
        },
      ])
    ).toEqual([
      {
        panelId: 'json',
        config: { spec: { format: 'json', value: { mark: 'point' } } },
      },
    ]);
  });

  test('omits non-Vega visualizations', () => {
    expect(
      migrateLegacyVegaPanels([{ id: 'pie', config: { savedVis: { type: 'pie', params: {} } } }])
    ).toEqual([]);
  });

  test('omits by-reference panels', () => {
    expect(
      migrateLegacyVegaPanels([
        { id: 'by-reference', config: { savedObjectId: 'visualization-id' } },
      ])
    ).toEqual([]);
  });

  test('gives a visualization reference precedence over inline state', () => {
    expect(
      migrateLegacyVegaPanels([
        {
          id: 'hybrid',
          config: {
            savedObjectId: 'visualization-id',
            savedVis: { type: 'vega', params: { spec: '{ mark: point }' } },
          },
        },
      ])
    ).toEqual([]);
  });

  test('does not treat an empty saved object ID as a reference', () => {
    expect(
      migrateLegacyVegaPanels([
        {
          id: 'by-value',
          config: {
            savedObjectId: '',
            savedVis: { type: 'vega', params: { spec: '{ mark: point }' } },
          },
        },
      ])
    ).toEqual([
      {
        panelId: 'by-value',
        config: { spec: { format: 'hjson', value: '{ mark: point }' } },
      },
    ]);
  });

  test('returns a per-panel error when a by-value Vega visualization has no spec', () => {
    const [result] = migrateLegacyVegaPanels([
      { id: 'vega', config: { savedVis: { type: 'vega', params: {} } } },
    ]);

    expect(result.panelId).toBe('vega');
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error.message).toBe('By-value Vega visualization is missing spec');
    }
  });
});
