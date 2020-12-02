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
import { getColumns } from './get_columns';
import { PieVisParams } from '../types';
import { createMockPieParams, createMockVisData } from '../mocks';

const visParams = createMockPieParams();
const visData = createMockVisData();

describe('getColumns', () => {
  it('should return the correct bucket columns if visParams returns dimensions', () => {
    const { bucketColumns } = getColumns(visParams, visData);
    expect(bucketColumns.length).toEqual(visParams.dimensions.buckets?.length);
    expect(bucketColumns).toEqual([
      {
        format: {
          id: 'terms',
          params: {
            id: 'string',
            missingBucketLabel: 'Missing',
            otherBucketLabel: 'Other',
          },
        },
        id: 'col-0-2',
        meta: {
          field: 'Carrier',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'terms',
            params: {
              id: 'string',
              missingBucketLabel: 'Missing',
              otherBucketLabel: 'Other',
            },
          },
          source: 'esaggs',
          sourceParams: {
            enabled: true,
            id: '2',
            indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            params: {
              field: 'Carrier',
              missingBucket: false,
              missingBucketLabel: 'Missing',
              order: 'desc',
              orderBy: '1',
              otherBucket: false,
              otherBucketLabel: 'Other',
              size: 5,
            },
            schema: 'segment',
            type: 'terms',
          },
          type: 'string',
        },
        name: 'Carrier: Descending',
      },
      {
        format: {
          id: 'terms',
          params: {
            id: 'boolean',
            missingBucketLabel: 'Missing',
            otherBucketLabel: 'Other',
          },
        },
        id: 'col-2-3',
        meta: {
          field: 'Cancelled',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'terms',
            params: {
              id: 'boolean',
              missingBucketLabel: 'Missing',
              otherBucketLabel: 'Other',
            },
          },
          source: 'esaggs',
          sourceParams: {
            enabled: true,
            id: '3',
            indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            params: {
              field: 'Cancelled',
              missingBucket: false,
              missingBucketLabel: 'Missing',
              order: 'desc',
              orderBy: '1',
              otherBucket: false,
              otherBucketLabel: 'Other',
              size: 5,
            },
            schema: 'segment',
            type: 'terms',
          },
          type: 'boolean',
        },
        name: 'Cancelled: Descending',
      },
    ]);
  });

  it('should return the correct metric column if visParams returns dimensions', () => {
    const { metricColumn } = getColumns(visParams, visData);
    expect(metricColumn).toEqual({
      id: 'col-3-1',
      meta: {
        index: 'kibana_sample_data_flights',
        params: { id: 'number' },
        source: 'esaggs',
        sourceParams: {
          enabled: true,
          id: '1',
          indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          params: {},
          schema: 'metric',
          type: 'count',
        },
        type: 'number',
      },
      name: 'Count',
    });
  });

  it('should return the first data column if no buckets specified', () => {
    const visParamsNoDimensions = ({
      addLegend: true,
      addTooltip: true,
      isDonut: true,
      labels: {
        position: 'default',
        show: true,
        truncate: 100,
        values: true,
        valuesFormat: 'percent',
      },
      legendPosition: 'right',
      nestedLegend: false,
      palette: {
        name: 'default',
        type: 'palette',
      },
      type: 'pie',
    } as unknown) as PieVisParams;
    const { metricColumn } = getColumns(visParamsNoDimensions, visData);
    expect(metricColumn).toEqual(visData.columns[0]);
  });

  it('should return anwith the name of the metric if no buckets specified', () => {
    const visParamsNoDimensions = ({
      addLegend: true,
      addTooltip: true,
      isDonut: true,
      labels: {
        position: 'default',
        show: true,
        truncate: 100,
        values: true,
        valuesFormat: 'percent',
      },
      legendPosition: 'right',
      nestedLegend: false,
      palette: {
        name: 'default',
        type: 'palette',
      },
      type: 'pie',
    } as unknown) as PieVisParams;
    const { bucketColumns, metricColumn } = getColumns(visParamsNoDimensions, visData);
    expect(bucketColumns).toEqual([{ name: metricColumn.name }]);
  });
});
