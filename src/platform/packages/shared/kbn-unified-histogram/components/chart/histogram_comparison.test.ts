/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import {
  applyHistogramComparisonAttributes,
  canApplyHistogramComparison,
} from './histogram_comparison';
import type { Datatable } from '@kbn/expressions-plugin/common';

const layerId = '662552df-2cdc-4539-bf3b-73b9f827252c';
const attributes = {
  title: 'Histogram',
  visualizationType: 'lnsXY',
  references: [],
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          [layerId]: {
            columns: [
              { columnId: 'timestamp', fieldName: 'timestamp', meta: { type: 'date' } },
              {
                columnId: 'results',
                fieldName: 'results',
                meta: { type: 'number' },
                inMetricDimension: true,
              },
            ],
          },
        },
      },
    },
    visualization: {
      layers: [{ layerId, seriesType: 'bar_stacked', accessors: ['results'] }],
    },
    query: { query: '', language: 'kuery' },
    filters: [],
  },
} as unknown as LensAttributes;

const table = {
  type: 'datatable',
  columns: [
    { id: 'timestamp', name: 'timestamp', meta: { type: 'date' } },
    { id: 'results', name: 'results', meta: { type: 'number' } },
    { id: 'overlay', name: 'Selected pattern', meta: { type: 'number' } },
    { id: 'remainder', name: 'Other documents', meta: { type: 'number' } },
  ],
  rows: [{ timestamp: 1, results: 4, overlay: 1, remainder: 3 }],
} as Datatable;

describe('histogram comparison attributes', () => {
  it('attaches a static table and draws the selected count below the remainder', () => {
    const derived = applyHistogramComparisonAttributes({
      attributes,
      table,
      colors: { overlay: '#selected', remainder: '#remainder' },
    });
    const layer = derived?.state.datasourceStates.textBased?.layers[layerId];
    const visualization = derived?.state.visualization as {
      layers: Array<{ accessors: string[]; yConfig: Array<{ forAccessor: string }> }>;
    };

    expect(layer?.table).toBe(table);
    expect(layer?.columns.map(({ label }) => label)).toEqual([
      undefined,
      undefined,
      'Selected pattern',
      'Other documents',
    ]);
    expect(visualization.layers[0].accessors).toEqual(['overlay', 'remainder']);
    expect(visualization.layers[0].yConfig.map(({ forAccessor }) => forAccessor)).toEqual([
      'overlay',
      'remainder',
    ]);
  });

  it('rejects unsupported chart shapes before a count is requested', () => {
    expect(canApplyHistogramComparison(attributes)).toBe(true);

    const multipleLayers = structuredClone(attributes);
    const visualization = multipleLayers.state.visualization as {
      layers: Array<Record<string, unknown>>;
    };
    visualization.layers.push({ layerId: 'layer2' });
    expect(canApplyHistogramComparison(multipleLayers)).toBe(false);

    const nonStacked = structuredClone(attributes);
    const nonStackedVisualization = nonStacked.state.visualization as {
      layers: Array<{ seriesType: string }>;
    };
    nonStackedVisualization.layers[0].seriesType = 'line';
    expect(canApplyHistogramComparison(nonStacked)).toBe(false);

    const mismatchedLayer = structuredClone(attributes);
    const mismatchedVisualization = mismatchedLayer.state.visualization as {
      layers: Array<{ layerId: string }>;
    };
    mismatchedVisualization.layers[0].layerId = 'other';
    expect(canApplyHistogramComparison(mismatchedLayer)).toBe(false);
  });
});
