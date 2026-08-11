/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableVisualizationState, FormBasedLayer } from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/server';
import { buildVisualizationState } from './to_state';
import { buildVisualizationAPI } from './to_api';

describe('Datatable columns transforms', () => {
  it('should preserve badge in colorMode <> apply_color_to conversion', () => {
    const metricColumnId = 'metric-column';
    const layerId = 'layer_0';

    const layer: Omit<FormBasedLayer, 'indexPatternId'> = {
      columns: {
        [metricColumnId]: {
          operationType: 'average',
          sourceField: 'bytes',
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          customLabel: false,
        },
      },
      columnOrder: [metricColumnId],
    };

    const visualization: DatatableVisualizationState = {
      layerId,
      layerType: 'data',
      columns: [
        {
          columnId: metricColumnId,
          isMetric: true,
          isTransposed: false,
          colorMode: 'badge',
        },
      ],
    };

    const references: SavedObjectReference[] = [
      {
        type: 'index-pattern',
        id: 'test-dataview',
        name: `indexpattern-datasource-layer-${layerId}`,
      },
    ];

    const apiConfig = buildVisualizationAPI(visualization, layer, layerId, {}, references);
    expect(apiConfig.metrics?.[0].apply_color_to).toBe('badge');

    const newVisualizationState = buildVisualizationState(apiConfig);
    expect(newVisualizationState.columns[0].colorMode).toBe('badge');
  });
});
