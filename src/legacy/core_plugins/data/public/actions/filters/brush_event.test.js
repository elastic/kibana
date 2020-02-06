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

import _ from 'lodash';
import moment from 'moment';
import expect from '@kbn/expect';

jest.mock('../../search/aggs', () => ({
  AggConfigs: function AggConfigs() {
    return {
      createAggConfig: ({ params }) => ({
        params,
        getIndexPattern: () => ({
          timeFieldName: 'time',
        }),
      }),
    };
  },
}));

import { onBrushEvent } from './brush_event';

describe('brushEvent', () => {
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const JAN_01_2014 = 1388559600000;

  const aggConfigs = [
    {
      params: {},
      getIndexPattern: () => ({
        timeFieldName: 'time',
      }),
    },
  ];

  const baseEvent = {
    data: {
      fieldFormatter: _.constant({}),
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
  };

  beforeEach(() => {
    baseEvent.data.indexPattern = {
      id: 'logstash-*',
      timeFieldName: 'time',
    };
  });

  test('should be a function', () => {
    expect(onBrushEvent).to.be.a(Function);
  });

  test('ignores event when data.xAxisField not provided', async () => {
    const event = _.cloneDeep(baseEvent);
    const filters = await onBrushEvent(event, () => ({
      get: () => baseEvent.data.indexPattern,
    }));
    expect(filters.length).to.equal(0);
  });

  describe('handles an event when the x-axis field is a date field', () => {
    describe('date field is index pattern timefield', () => {
      let dateEvent;
      const dateField = {
        name: 'time',
        type: 'date',
      };

      beforeEach(() => {
        aggConfigs[0].params.field = dateField;
        dateEvent = _.cloneDeep(baseEvent);
        dateEvent.data.ordered = { date: true };
      });

      test('by ignoring the event when range spans zero time', async () => {
        const event = _.cloneDeep(dateEvent);
        event.range = [JAN_01_2014, JAN_01_2014];
        const filters = await onBrushEvent(event, () => ({
          get: () => dateEvent.data.indexPattern,
        }));
        expect(filters.length).to.equal(0);
      });

      test('by updating the timefilter', async () => {
        const event = _.cloneDeep(dateEvent);
        event.range = [JAN_01_2014, JAN_01_2014 + DAY_IN_MS];
        const filters = await onBrushEvent(event, () => ({
          get: async () => dateEvent.data.indexPattern,
        }));
        expect(filters[0].range.time.gte).to.be(new Date(JAN_01_2014).toISOString());
        // Set to a baseline timezone for comparison.
        expect(filters[0].range.time.lt).to.be(new Date(JAN_01_2014 + DAY_IN_MS).toISOString());
      });
    });

    describe('date field is not index pattern timefield', () => {
      let dateEvent;
      const dateField = {
        name: 'anotherTimeField',
        type: 'date',
      };

      beforeEach(() => {
        aggConfigs[0].params.field = dateField;
        dateEvent = _.cloneDeep(baseEvent);
        dateEvent.data.ordered = { date: true };
      });

      test('creates a new range filter', async () => {
        const event = _.cloneDeep(dateEvent);
        const rangeBegin = JAN_01_2014;
        const rangeEnd = rangeBegin + DAY_IN_MS;
        event.range = [rangeBegin, rangeEnd];
        const filters = await onBrushEvent(event, () => ({
          get: () => dateEvent.data.indexPattern,
        }));
        expect(filters.length).to.equal(1);
        expect(filters[0].range.anotherTimeField.gte).to.equal(moment(rangeBegin).toISOString());
        expect(filters[0].range.anotherTimeField.lt).to.equal(moment(rangeEnd).toISOString());
        expect(filters[0].range.anotherTimeField).to.have.property('format');
        expect(filters[0].range.anotherTimeField.format).to.equal('strict_date_optional_time');
      });
    });
  });

  describe('handles an event when the x-axis field is a number', () => {
    let numberEvent;
    const numberField = {
      name: 'numberField',
      type: 'number',
    };

    beforeEach(() => {
      aggConfigs[0].params.field = numberField;
      numberEvent = _.cloneDeep(baseEvent);
      numberEvent.data.ordered = { date: false };
    });

    test('by ignoring the event when range does not span at least 2 values', async () => {
      const event = _.cloneDeep(numberEvent);
      event.range = [1];
      const filters = await onBrushEvent(event, () => ({
        get: () => numberEvent.data.indexPattern,
      }));
      expect(filters.length).to.equal(0);
    });

    test('by creating a new filter', async () => {
      const event = _.cloneDeep(numberEvent);
      event.range = [1, 2, 3, 4];
      const filters = await onBrushEvent(event, () => ({
        get: () => numberEvent.data.indexPattern,
      }));
      expect(filters.length).to.equal(1);
      expect(filters[0].range.numberField.gte).to.equal(1);
      expect(filters[0].range.numberField.lt).to.equal(4);
      expect(filters[0].range.numberField).not.to.have.property('format');
    });
  });
});
