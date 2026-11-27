/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { tableMock } from '../__mocks__/table';
import {
  enrichLensAttributesWithTablesData,
  removeTablesFromLensAttributes,
} from './lens_vis_from_table';

const esqlQuery = 'FROM logs | STATS metric = AVG(bytes) | EVAL max = 10000';
const trendlineQuery =
  'FROM logs | STATS metric = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

const createAttributes = (): LensAttributes => ({
  title: '',
  visualizationType: 'lnsMetric',
  references: [],
  state: {
    query: { language: 'kuery', query: '' },
    filters: [],
    visualization: {},
    datasourceStates: {
      textBased: {
        layers: {
          main: { columns: [], query: { esql: esqlQuery } },
          trendline: { columns: [], query: { esql: trendlineQuery }, table: tableMock },
          unconfigured: { columns: [] },
        },
      },
    },
  },
});

describe('enrichLensAttributesWithTablesData', () => {
  it('reuses the table only for matching queries and removes stale tables without mutating input', () => {
    const attributes = createAttributes();
    const result = enrichLensAttributesWithTablesData({ attributes, table: tableMock, esqlQuery });
    const layers = result.state.datasourceStates.textBased?.layers;

    expect(layers?.main.table).toBe(tableMock);
    expect(layers?.trendline).not.toHaveProperty('table');
    expect(layers?.unconfigured).not.toHaveProperty('table');
    expect(attributes.state.datasourceStates.textBased?.layers.main).not.toHaveProperty('table');
    expect(attributes.state.datasourceStates.textBased?.layers.trendline.table).toBe(tableMock);
  });

  it('does not reuse tables when the source query is unavailable', () => {
    const result = enrichLensAttributesWithTablesData({
      attributes: createAttributes(),
      table: tableMock,
    });

    for (const layer of Object.values(result.state.datasourceStates.textBased?.layers ?? {})) {
      expect(layer).not.toHaveProperty('table');
    }
  });

  it('requires an exact query match', () => {
    const result = enrichLensAttributesWithTablesData({
      attributes: createAttributes(),
      table: tableMock,
      esqlQuery: `${esqlQuery} `,
    });

    expect(result.state.datasourceStates.textBased?.layers.main).not.toHaveProperty('table');
  });

  it('removes all tables when no prefetched table is supplied', () => {
    const result = removeTablesFromLensAttributes(createAttributes());

    for (const layer of Object.values(
      result.attributes.state.datasourceStates.textBased?.layers ?? {}
    )) {
      expect(layer).not.toHaveProperty('table');
    }
  });
});
