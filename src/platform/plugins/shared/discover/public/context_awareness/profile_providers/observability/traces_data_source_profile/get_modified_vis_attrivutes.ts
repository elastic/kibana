/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';

export const getModifiedVisAttributes = (
  esql: string,
  prevAttributes: TypedLensByValueInput['attributes']
): TypedLensByValueInput['attributes'] => {
  const prevState = prevAttributes.state;
  const prevTextBased = prevState.datasourceStates.textBased;
  const prevLayers = prevTextBased?.layers;
  const layerId = Object.keys(prevLayers || {})[0];
  if (prevTextBased === undefined || prevLayers === undefined || layerId === undefined) {
    return prevAttributes;
  }

  return {
    title: 'Duration Heatmap by Timestamp',
    references: [],
    visualizationType: 'lnsHeatmap',
    state: {
      ...prevState,
      datasourceStates: {
        textBased: {
          ...prevTextBased,
          layers: {
            [layerId]: {
              ...prevLayers[layerId],
              query: { esql },
              columns: [
                ...prevLayers[layerId].columns,
                {
                  columnId: 'duration_bucket',
                  fieldName: 'duration_bucket',
                  label: 'duration bucket(ms)',
                  customLabel: true,
                  meta: { type: 'number' },
                },
              ],
            },
          },
        },
      },
      query: { esql },
      visualization: {
        layerId,
        layerType: 'data',
        shape: 'heatmap',
        legend: {
          isVisible: false,
        },
        xAccessor: 'timestamp',
        yAccessor: 'duration_bucket',
        valueAccessor: 'results',
        gridConfig: {
          xAxisLabelRotation: 10,
          isCellLabelVisible: false,
          isYAxisLabelVisible: true,
          isXAxisLabelVisible: true,
          isYAxisTitleVisible: true,
          isXAxisTitleVisible: true,
          type: 'heatmap_grid',
        },
      },
    },
  };
};
