/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Datatable } from '../../expressions/public';
import { BucketColumns, PieVisParams, LabelPositions, ValueFormats } from './types';

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
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
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
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
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
        'col-2-3': 0,
        'col-1-1': 797,
        'col-3-1': 689,
      },
      {
        'col-0-2': 'Logstash Airways',
        'col-2-3': 1,
        'col-1-1': 797,
        'col-3-1': 108,
      },
      {
        'col-0-2': 'JetBeats',
        'col-2-3': 0,
        'col-1-1': 766,
        'col-3-1': 654,
      },
      {
        'col-0-2': 'JetBeats',
        'col-2-3': 1,
        'col-1-1': 766,
        'col-3-1': 112,
      },
      {
        'col-0-2': 'ES-Air',
        'col-2-3': 0,
        'col-1-1': 744,
        'col-3-1': 665,
      },
      {
        'col-0-2': 'ES-Air',
        'col-2-3': 1,
        'col-1-1': 744,
        'col-3-1': 79,
      },
      {
        'col-0-2': 'Kibana Airlines',
        'col-2-3': 0,
        'col-1-1': 731,
        'col-3-1': 655,
      },
      {
        'col-0-2': 'Kibana Airlines',
        'col-2-3': 1,
        'col-1-1': 731,
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

export const createMockPieParams = (): PieVisParams => {
  return ({
    addLegend: true,
    addTooltip: true,
    isDonut: true,
    labels: {
      position: LabelPositions.DEFAULT,
      show: true,
      truncate: 100,
      values: true,
      valuesFormat: ValueFormats.PERCENT,
    },
    legendPosition: 'right',
    nestedLegend: false,
    palette: {
      name: 'default',
      type: 'palette',
    },
    type: 'pie',
    dimensions: {
      metric: {
        accessor: 1,
        format: {
          id: 'number',
        },
        params: {},
        label: 'Count',
        aggType: 'count',
      },
      buckets: [
        {
          accessor: 0,
          format: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: 'Missing',
            },
          },
          label: 'Carrier: Descending',
          aggType: 'terms',
        },
        {
          accessor: 2,
          format: {
            id: 'terms',
            params: {
              id: 'boolean',
              otherBucketLabel: 'Other',
              missingBucketLabel: 'Missing',
            },
          },
          label: 'Cancelled: Descending',
          aggType: 'terms',
        },
      ],
    },
  } as unknown) as PieVisParams;
};
