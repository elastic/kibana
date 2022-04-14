/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Position } from '@elastic/charts';
import {
  LabelPositions,
  LegendDisplay,
  RenderValue,
  PartitionVisParams,
  ValueFormats,
} from '../../../common/types';

export const config: RenderValue['visConfig'] = {
  addTooltip: true,
  legendDisplay: LegendDisplay.HIDE,
  legendSize: 80,
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
  },
  dimensions: {
    metric: {
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
  },
};

export const pieConfig: PartitionVisParams = {
  ...config,
  isDonut: false,
  emptySizeRatio: 0,
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
  showValuesInLegend: false,
};
