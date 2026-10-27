/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping } from '@kbn/coloring';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { applyBreakdownColorMapping } from './apply_breakdown_color_mapping';

const colorMapping: ColorMapping.Config = {
  paletteId: 'default',
  colorMode: { type: 'categorical' },
  assignments: [
    {
      rules: [{ type: 'raw', value: 'error' }],
      color: { type: 'colorCode', colorCode: '#ff0000' },
    },
  ],
  specialAssignments: [{ rules: [{ type: 'other' }], color: { type: 'loop' } }],
};

const getXYAttributes = (
  layers: Array<Record<string, unknown>>
): TypedLensByValueInput['attributes'] =>
  ({
    title: 'test',
    visualizationType: 'lnsXY',
    references: [],
    state: {
      query: { esql: 'from logs' },
      filters: [],
      datasourceStates: {},
      visualization: { legend: { isVisible: true }, layers },
    },
  } as unknown as TypedLensByValueInput['attributes']);

describe('applyBreakdownColorMapping', () => {
  it('sets the color mapping on data layers that split by a breakdown', () => {
    const attributes = getXYAttributes([
      { layerId: 'a', layerType: 'data', splitAccessors: ['breakdown_column'] },
    ]);

    const result = applyBreakdownColorMapping(attributes, colorMapping);

    expect(result.state.visualization).toEqual({
      legend: { isVisible: true },
      layers: [
        { layerId: 'a', layerType: 'data', splitAccessors: ['breakdown_column'], colorMapping },
      ],
    });
  });

  it('leaves layers without a breakdown and non-data layers untouched', () => {
    const layers = [
      { layerId: 'a', layerType: 'data', accessors: ['count_column'] },
      { layerId: 'b', layerType: 'data', splitAccessors: [] },
      { layerId: 'c', layerType: 'annotations', splitAccessors: ['x'] },
    ];

    const result = applyBreakdownColorMapping(getXYAttributes(layers), colorMapping);

    expect((result.state.visualization as { layers: unknown[] }).layers).toEqual(layers);
  });

  it('returns attributes of other chart types unchanged', () => {
    const attributes = {
      ...getXYAttributes([{ layerId: 'a', layerType: 'data', splitAccessors: ['x'] }]),
      visualizationType: 'lnsMetric',
    };

    expect(applyBreakdownColorMapping(attributes, colorMapping)).toBe(attributes);
  });

  it('does not mutate the input attributes', () => {
    const attributes = getXYAttributes([
      { layerId: 'a', layerType: 'data', splitAccessors: ['breakdown_column'] },
    ]);
    const snapshot = JSON.parse(JSON.stringify(attributes));

    applyBreakdownColorMapping(attributes, colorMapping);

    expect(attributes).toEqual(snapshot);
  });
});
