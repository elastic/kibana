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
} from '../../../../../../plugins/data/public';
import { createFiltersFromEvent } from './create_filters_from_event';

jest.mock('ui/new_platform');

jest.mock('../../../../../../plugins/data/public/services', () => ({
  getIndexPatterns: () => {
    return {
      get: async () => {
        return {
          id: 'logstash-*',
          fields: [
            {
              name: 'bytes',
              format: {
                getConverterFor: () => '',
              },
            },
          ],
        };
      },
    };
  },
}));

describe('createFiltersFromEvent', () => {
  let baseEvent: any;

  beforeEach(() => {
    baseEvent = {
      data: [
        {
          table: {
            columns: [
              {
                id: '1-1',
                meta: {
                  type: 'histogram',
                  indexPatternId: 'logstash-1',
                  aggConfigParams: {
                    field: {
                      name: 'bytes',
                      filterable: true,
                      indexPattern: {
                        id: 'logstash-*',
                      },
                      format: new fieldFormats.BytesFormat(
                        {},
                        (() => {}) as FieldFormatsGetConfigFn
                      ),
                    },
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
      ],
    };
  });

  test('ignores event when value for rows is not provided', async () => {
    baseEvent.data[0].table.rows[0]['1-1'] = null;
    const filters = await createFiltersFromEvent(baseEvent);
    expect(filters.length).toEqual(0);
  });

  test('handles an event when aggregations type is a terms', async () => {
    baseEvent.data[0].table.columns[0].meta.type = 'terms';
    const filters = await createFiltersFromEvent(baseEvent);
    expect(filters.length).toEqual(1);
    expect(filters[0].query.match_phrase.bytes).toEqual('2048');
  });

  test('handles an event when aggregations type is not terms', async () => {
    const filters = await createFiltersFromEvent(baseEvent);

    expect(filters.length).toEqual(1);

    const [rangeFilter] = filters;

    if (esFilters.isRangeFilter(rangeFilter)) {
      expect(rangeFilter.range.bytes.gte).toEqual(2048);
      expect(rangeFilter.range.bytes.lt).toEqual(2078);
    }
  });
});
