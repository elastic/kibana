/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Position } from '@elastic/charts';
import { LabelPositions, LegendDisplay, RenderValue, ValueFormats } from '../../../common/types';

export const config: RenderValue['visConfig'] = {
  addTooltip: true,
  legendDisplay: LegendDisplay.HIDE,
  nestedLegend: false,
  truncateLegend: true,
  distinctColors: false,
  respectSourceOrder: true,
  isDonut: false,
  legendPosition: Position.Bottom,
  maxLegendLines: 1,
  emptySizeRatio: 0.3,
  palette: {
    type: 'palette',
    name: 'system_palette',
  },
  labels: {
    show: true,
    position: LabelPositions.DEFAULT,
    percentDecimals: 2,
    values: true,
    truncate: 0,
    valuesFormat: ValueFormats.PERCENT,
    lastLevel: false,
  },
  startFromSecondLargestSlice: true,
  dimensions: {
    metric: {
      type: 'vis_dimension',
      accessor: {
        id: 'price',
        name: 'price',
        meta: {
          type: 'number',
        },
      },
      format: {
        id: 'string',
        params: {},
      },
    },
    buckets: [
      {
        type: 'vis_dimension',
        accessor: {
          id: 'cost',
          name: 'cost',
          meta: {
            type: 'number',
          },
        },
        format: {
          id: 'string',
          params: {},
        },
      },
    ],
  },
};
