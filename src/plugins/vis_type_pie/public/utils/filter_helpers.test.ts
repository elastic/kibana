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
import { Datatable } from '../../../expressions/public';
import { getFilterClickData } from './filter_helpers';
import { BucketColumns } from '../types';

const bucketColumns = [
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
] as BucketColumns[];

const visData = {
  type: 'datatable',
  rows: [
    {
      'col-0-2': 'Logstash Airways',
      'col-1-1': 729,
    },
    {
      'col-0-2': 'JetBeats',
      'col-1-1': 706,
    },
    {
      'col-0-2': 'ES-Air',
      'col-1-1': 672,
    },
    {
      'col-0-2': 'Kibana Airlines',
      'col-1-1': 662,
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
  ],
} as Datatable;

describe('getFilterClickData', () => {
  it('returns the correct filter data for the specific layer', () => {
    const clickedLayers = [
      {
        groupByRollup: 'Logstash Airways',
        value: 729,
      },
    ];
    const data = getFilterClickData(clickedLayers, bucketColumns, visData);
    expect(data.length).toEqual(clickedLayers.length);
    expect(data[0].value).toEqual('Logstash Airways');
    expect(data[0].row).toEqual(0);
    expect(data[0].column).toEqual(0);
  });

  it('changes if the user clicks on another layer', () => {
    const clickedLayers = [
      {
        groupByRollup: 'ES-Air',
        value: 572,
      },
    ];
    const data = getFilterClickData(clickedLayers, bucketColumns, visData);
    expect(data.length).toEqual(clickedLayers.length);
    expect(data[0].value).toEqual('ES-Air');
    expect(data[0].row).toEqual(2);
    expect(data[0].column).toEqual(0);
  });
});
