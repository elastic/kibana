/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@elastic/charts';
import {
  LabelPositions,
  LegendDisplay,
  PartitionChartProps,
  PartitionVisParams,
  ValueFormats,
} from '../../../common/types';

export const config: PartitionChartProps['visConfig'] = {
  addTooltip: true,
  legendDisplay: LegendDisplay.HIDE,
  metricsToLabels: { percent_uptime: 'percent_uptime' },
  truncateLegend: true,
  respectSourceOrder: true,
  legendPosition: Position.Bottom,
  maxLegendLines: 1,
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
    last_level: false,
    colorOverrides: {},
  },
  dimensions: {
    metrics: [
      {
        type: 'vis_dimension',
        accessor: {
          id: 'percent_uptime',
          name: 'percent_uptime',
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

export const pieConfig: PartitionVisParams = {
  ...config,
  isDonut: false,
  emptySizeRatio: 0.3,
  distinctColors: false,
  nestedLegend: false,
  dimensions: {
    ...config.dimensions,
    buckets: [
      {
        type: 'vis_dimension',
        accessor: {
          id: 'project',
          name: 'project',
          meta: {
            type: 'string',
          },
        },
        format: {
          id: 'string',
          params: {},
        },
      },
    ],
  },
  startFromSecondLargestSlice: true,
};

export const treemapMosaicConfig: PartitionVisParams = {
  ...config,
  nestedLegend: false,
  dimensions: {
    ...config.dimensions,
    buckets: [
      {
        type: 'vis_dimension',
        accessor: {
          id: 'project',
          name: 'project',
          meta: {
            type: 'string',
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

export const waffleConfig: PartitionVisParams = {
  ...config,
  dimensions: {
    ...config.dimensions,
    buckets: [
      {
        type: 'vis_dimension',
        accessor: {
          id: 'project',
          name: 'project',
          meta: {
            type: 'string',
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
