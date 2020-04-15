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

import moment from 'moment';

import { onBrushEvent, BrushEvent } from './brush_event';

import { IndexPatternsContract } from '../../../public';
import { dataPluginMock } from '../../../public/mocks';
import { setIndexPatterns } from '../../../public/services';
import { mockDataServices } from '../../../public/search/aggs/test_helpers';

describe('brushEvent', () => {
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const JAN_01_2014 = 1388559600000;
  let baseEvent: BrushEvent;

  const aggConfigs = [
    {
      params: {
        field: {},
      },
      getIndexPattern: () => ({
        timeFieldName: 'time',
        fields: {
          getByName: () => undefined,
          filter: () => [],
        },
      }),
    },
  ];

  beforeEach(() => {
    mockDataServices();
    setIndexPatterns(({
      ...dataPluginMock.createStartContract().indexPatterns,
      get: async () => ({
        id: 'indexPatternId',
        timeFieldName: 'time',
        fields: {
          getByName: () => undefined,
          filter: () => [],
        },
      }),
    } as unknown) as IndexPatternsContract);

    baseEvent = {
      data: {
        ordered: {
          date: false,
        },
        series: [
          {
            values: [
              {
                xRaw: {
                  column: 0,
                  table: {
                    columns: [
                      {
                        id: '1',
                        meta: {
                          type: 'histogram',
                          indexPatternId: 'indexPatternId',
                          aggConfigParams: aggConfigs[0].params,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        ],
      },
      range: [],
    };
  });

  test('should be a function', () => {
    expect(typeof onBrushEvent).toBe('function');
  });

  test('ignores event when data.xAxisField not provided', async () => {
    const filter = await onBrushEvent(baseEvent);
    expect(filter).toBeUndefined();
  });

  describe('handles an event when the x-axis field is a date field', () => {
    describe('date field is index pattern timefield', () => {
      beforeEach(() => {
        aggConfigs[0].params.field = {
          name: 'time',
          type: 'date',
        };
        baseEvent.data.ordered = { date: true };
      });

      afterAll(() => {
        baseEvent.range = [];
        baseEvent.data.ordered = { date: false };
      });

      test('by ignoring the event when range spans zero time', async () => {
        baseEvent.range = [JAN_01_2014, JAN_01_2014];
        const filter = await onBrushEvent(baseEvent);
        expect(filter).toBeUndefined();
      });

      test('by updating the timefilter', async () => {
        baseEvent.range = [JAN_01_2014, JAN_01_2014 + DAY_IN_MS];
        const filter = await onBrushEvent(baseEvent);
        expect(filter).toBeDefined();

        if (filter) {
          expect(filter.range.time.gte).toBe(new Date(JAN_01_2014).toISOString());
          // Set to a baseline timezone for comparison.
          expect(filter.range.time.lt).toBe(new Date(JAN_01_2014 + DAY_IN_MS).toISOString());
        }
      });
    });

    describe('date field is not index pattern timefield', () => {
      beforeEach(() => {
        aggConfigs[0].params.field = {
          name: 'anotherTimeField',
          type: 'date',
        };
        baseEvent.data.ordered = { date: true };
      });

      afterAll(() => {
        baseEvent.range = [];
        baseEvent.data.ordered = { date: false };
      });

      test('creates a new range filter', async () => {
        const rangeBegin = JAN_01_2014;
        const rangeEnd = rangeBegin + DAY_IN_MS;
        baseEvent.range = [rangeBegin, rangeEnd];
        const filter = await onBrushEvent(baseEvent);

        expect(filter).toBeDefined();

        if (filter) {
          expect(filter.range.anotherTimeField.gte).toBe(moment(rangeBegin).toISOString());
          expect(filter.range.anotherTimeField.lt).toBe(moment(rangeEnd).toISOString());
          expect(filter.range.anotherTimeField).toHaveProperty(
            'format',
            'strict_date_optional_time'
          );
        }
      });
    });
  });

  describe('handles an event when the x-axis field is a number', () => {
    beforeAll(() => {
      aggConfigs[0].params.field = {
        name: 'numberField',
        type: 'number',
      };
    });

    afterAll(() => {
      baseEvent.range = [];
    });

    test('by ignoring the event when range does not span at least 2 values', async () => {
      baseEvent.range = [1];
      const filter = await onBrushEvent(baseEvent);
      expect(filter).toBeUndefined();
    });

    test('by creating a new filter', async () => {
      baseEvent.range = [1, 2, 3, 4];
      const filter = await onBrushEvent(baseEvent);

      expect(filter).toBeDefined();

      if (filter) {
        expect(filter.range.numberField.gte).toBe(1);
        expect(filter.range.numberField.lt).toBe(4);
        expect(filter.range.numberField).not.toHaveProperty('format');
      }
    });
  });
});
