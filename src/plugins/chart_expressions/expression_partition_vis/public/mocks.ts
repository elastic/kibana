/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '../../../expressions/public';
import {
  BucketColumns,
  PartitionVisParams,
  LabelPositions,
  ValueFormats,
  LegendDisplay,
} from '../common/types';

export const createMockBucketColumns = (): BucketColumns[] => {
  return [
    {
      id: 'col-0-2',
      name: 'Carrier: Descending',
      meta: {
        type: 'string',
        field: 'Carrier',
        index: 'kibana_sample_data_flights',
        params: {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: 'Other',
            missingBucketLabel: 'Missing',
          },
        },
        source: 'esaggs',
        sourceParams: {
          indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          id: '2',
          enabled: true,
          type: 'terms',
          params: {
            field: 'Carrier',
            orderBy: '1',
            order: 'desc',
            size: 5,
            otherBucket: false,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: 'Missing',
          },
          schema: 'segment',
        },
      },
      format: {
        id: 'terms',
        params: {
          id: 'string',
        },
      },
    },
    {
      id: 'col-2-3',
      name: 'Cancelled: Descending',
      meta: {
        type: 'boolean',
        field: 'Cancelled',
        index: 'kibana_sample_data_flights',
        params: {
          id: 'terms',
          params: {
            id: 'boolean',
            otherBucketLabel: 'Other',
            missingBucketLabel: 'Missing',
          },
        },
        source: 'esaggs',
        sourceParams: {
          indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          id: '3',
          enabled: true,
          type: 'terms',
          params: {
            field: 'Cancelled',
            orderBy: '1',
            order: 'desc',
            size: 5,
            otherBucket: false,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: 'Missing',
          },
          schema: 'segment',
        },
      },
      format: {
        id: 'terms',
        params: {
          id: 'boolean',
        },
      },
    },
  ];
};

export const createMockVisData = (): Datatable => {
  return {
    type: 'datatable',
    rows: [
      {
        'col-0-2': 'Logstash Airways',
        'col-1-1': 797,
        'col-2-3': 0,
        'col-3-1': 689,
      },
      {
        'col-0-2': 'Logstash Airways',
        'col-1-1': 797,
        'col-2-3': 1,
        'col-3-1': 108,
      },
      {
        'col-0-2': 'JetBeats',
        'col-1-1': 766,
        'col-2-3': 0,
        'col-3-1': 654,
      },
      {
        'col-0-2': 'JetBeats',
        'col-1-1': 766,
        'col-2-3': 1,
        'col-3-1': 112,
      },
      {
        'col-0-2': 'ES-Air',
        'col-1-1': 744,
        'col-2-3': 0,
        'col-3-1': 665,
      },
      {
        'col-0-2': 'ES-Air',
        'col-1-1': 744,
        'col-2-3': 1,
        'col-3-1': 79,
      },
      {
        'col-0-2': 'Kibana Airlines',
        'col-1-1': 731,
        'col-2-3': 0,
        'col-3-1': 655,
      },
      {
        'col-0-2': 'Kibana Airlines',
        'col-1-1': 731,
        'col-2-3': 1,
        'col-3-1': 76,
      },
    ],
    columns: [
      {
        id: 'col-0-2',
        name: 'Carrier: Descending',
        meta: {
          type: 'string',
          field: 'Carrier',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: 'Missing',
            },
          },
          source: 'esaggs',
          sourceParams: {
            indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            id: '2',
            enabled: true,
            type: 'terms',
            params: {
              field: 'Carrier',
              orderBy: '1',
              order: 'desc',
              size: 5,
              otherBucket: false,
              otherBucketLabel: 'Other',
              missingBucket: false,
              missingBucketLabel: 'Missing',
            },
            schema: 'segment',
          },
        },
      },
      {
        id: 'col-1-1',
        name: 'Count',
        meta: {
          type: 'number',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'number',
          },
          source: 'esaggs',
          sourceParams: {
            indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            id: '1',
            enabled: true,
            type: 'count',
            params: {},
            schema: 'metric',
          },
        },
      },
      {
        id: 'col-2-3',
        name: 'Cancelled: Descending',
        meta: {
          type: 'boolean',
          field: 'Cancelled',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'terms',
            params: {
              id: 'boolean',
              otherBucketLabel: 'Other',
              missingBucketLabel: 'Missing',
            },
          },
          source: 'esaggs',
          sourceParams: {
            indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            id: '3',
            enabled: true,
            type: 'terms',
            params: {
              field: 'Cancelled',
              orderBy: '1',
              order: 'desc',
              size: 5,
              otherBucket: false,
              otherBucketLabel: 'Other',
              missingBucket: false,
              missingBucketLabel: 'Missing',
            },
            schema: 'segment',
          },
        },
      },
      {
        id: 'col-3-1',
        name: 'Count',
        meta: {
          type: 'number',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'number',
          },
          source: 'esaggs',
          sourceParams: {
            indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            id: '1',
            enabled: true,
            type: 'count',
            params: {},
            schema: 'metric',
          },
        },
      },
    ],
  };
};

export const createMockPartitionVisParams = (): PartitionVisParams => {
  return {
    legendDisplay: LegendDisplay.SHOW,
    addTooltip: true,
    isDonut: true,
    labels: {
      position: LabelPositions.DEFAULT,
      show: true,
      truncate: 100,
      values: true,
      valuesFormat: ValueFormats.PERCENT,
      percentDecimals: 2,
    },
    legendPosition: 'right',
    nestedLegend: false,
    maxLegendLines: 1,
    truncateLegend: true,
    distinctColors: false,
    palette: {
      name: 'default',
      type: 'palette',
    },
    dimensions: {
      metric: {
        type: 'vis_dimension',
        accessor: 1,
        format: {
          id: 'number',
          params: {
            id: 'number',
          },
        },
      },
      buckets: [
        {
          type: 'vis_dimension',
          accessor: 0,
          format: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: 'Missing',
            },
          },
        },
        {
          type: 'vis_dimension',
          accessor: 2,
          format: {
            id: 'terms',
            params: {
              id: 'boolean',
              otherBucketLabel: 'Other',
              missingBucketLabel: 'Missing',
            },
          },
        },
      ],
    },
  };
};

export const createMockPieParams = (): PartitionVisParams => {
  return {
    ...createMockPartitionVisParams(),
    isDonut: false,
    distinctColors: false,
  };
};

export const createMockDonutParams = (): PartitionVisParams => {
  return {
    ...createMockPartitionVisParams(),
    isDonut: true,
    emptySizeRatio: 0.3,
  };
};

export const createMockTreemapMosaicParams = (): PartitionVisParams => {
  return {
    ...createMockPartitionVisParams(),
    nestedLegend: true,
  };
};

export const createMockWaffleParams = (): PartitionVisParams => {
  const visParams = createMockPartitionVisParams();
  return {
    ...visParams,
    dimensions: {
      ...visParams.dimensions,
      buckets: [
        {
          type: 'vis_dimension',
          accessor: 0,
          format: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: 'Missing',
            },
          },
        },
      ],
    },
    showValuesInLegend: true,
  };
};
