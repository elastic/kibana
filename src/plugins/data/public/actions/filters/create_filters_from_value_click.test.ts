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

import {
  fieldFormats,
  FieldFormatsGetConfigFn,
  esFilters,
  IndexPatternsContract,
} from '../../../public';
import { dataPluginMock } from '../../../public/mocks';
import { setIndexPatterns, setSearchService } from '../../../public/services';
import { createFiltersFromValueClickAction } from './create_filters_from_value_click';
import { ValueClickContext } from '../../../../embeddable/public';

const mockField = {
  name: 'bytes',
  indexPattern: {
    id: 'logstash-*',
  },
  filterable: true,
  format: new fieldFormats.BytesFormat({}, (() => {}) as FieldFormatsGetConfigFn),
};

describe('createFiltersFromValueClick', () => {
  let dataPoints: ValueClickContext['data']['data'];

  beforeEach(() => {
    dataPoints = [
      {
        table: {
          columns: [
            {
              name: 'test',
              id: '1-1',
              meta: {
                type: 'histogram',
                indexPatternId: 'logstash-*',
                aggConfigParams: {
                  field: 'bytes',
                  interval: 30,
                  otherBucket: true,
                },
              },
            },
          ],
          rows: [
            {
              '1-1': '2048',
            },
          ],
        },
        column: 0,
        row: 0,
        value: 'test',
      },
    ];

    const dataStart = dataPluginMock.createStartContract();
    setSearchService(dataStart.search);
    setIndexPatterns(({
      ...dataStart.indexPatterns,
      get: async () => ({
        id: 'logstash-*',
        fields: {
          getByName: () => mockField,
          filter: () => [mockField],
        },
      }),
    } as unknown) as IndexPatternsContract);
  });

  test('ignores event when value for rows is not provided', async () => {
    dataPoints[0].table.rows[0]['1-1'] = null;
    const filters = await createFiltersFromValueClickAction({ data: dataPoints });

    expect(filters.length).toEqual(0);
  });

  test('handles an event when aggregations type is a terms', async () => {
    if (dataPoints[0].table.columns[0].meta) {
      dataPoints[0].table.columns[0].meta.type = 'terms';
    }
    const filters = await createFiltersFromValueClickAction({ data: dataPoints });

    expect(filters.length).toEqual(1);
    expect(filters[0].query.match_phrase.bytes).toEqual('2048');
  });

  test('handles an event when aggregations type is not terms', async () => {
    const filters = await createFiltersFromValueClickAction({ data: dataPoints });

    expect(filters.length).toEqual(1);

    const [rangeFilter] = filters;

    if (esFilters.isRangeFilter(rangeFilter)) {
      expect(rangeFilter.range.bytes.gte).toEqual(2048);
      expect(rangeFilter.range.bytes.lt).toEqual(2078);
    }
  });
});
