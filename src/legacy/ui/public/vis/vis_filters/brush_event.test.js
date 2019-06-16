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

jest.mock('ui/chrome',
  () => ({
    getBasePath: () => `/some/base/path`,
    getUiSettingsClient: () => {
      return {
        get: (key) => {
          switch (key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now' };
            case 'timepicker:refreshIntervalDefaults':
              return { pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    },
  }), { virtual: true });

import _ from 'lodash';
import moment from 'moment';
import expect from '@kbn/expect';
import { onBrushEvent } from './brush_event';
import { timefilter } from 'ui/timefilter';

describe('brushEvent', () => {
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const JAN_01_2014 = 1388559600000;

  let $state;

  const baseState = {
    filters: [],
  };

  const baseEvent = {
    aggConfigs: [{
      params: {},
      getIndexPattern: () => ({
        timeFieldName: 'time',
      })
    }],
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
                    },
                  ]
                }
              }
            },
          ]
        },
      ]
    },
  };

  beforeEach(() => {
    baseEvent.data.indexPattern = {
      id: 'logstash-*',
      timeFieldName: 'time'
    };
    $state = _.cloneDeep(baseState);
  });

  test('should be a function', () => {
    expect(onBrushEvent).to.be.a(Function);
  });

  test('ignores event when data.xAxisField not provided', () => {
    const event = _.cloneDeep(baseEvent);
    onBrushEvent(event, $state);
    expect($state)
      .not.have.property('$newFilters');
  });

  describe('handles an event when the x-axis field is a date field', () => {
    describe('date field is index pattern timefield', () => {
      let dateEvent;
      const dateField = {
        name: 'time',
        type: 'date'
      };

      beforeEach(() => {
        dateEvent = _.cloneDeep(baseEvent);
        dateEvent.aggConfigs[0].params.field = dateField;
        dateEvent.data.ordered = { date: true };
      });

      test('by ignoring the event when range spans zero time', () => {
        const event = _.cloneDeep(dateEvent);
        event.range = [JAN_01_2014, JAN_01_2014];
        onBrushEvent(event, $state);
        expect($state)
          .not.have.property('$newFilters');
      });

      test('by updating the timefilter', () => {
        const event = _.cloneDeep(dateEvent);
        event.range = [JAN_01_2014, JAN_01_2014 + DAY_IN_MS];
        onBrushEvent(event, $state);
        const { from, to } = timefilter.getTime();
        // Set to a baseline timezone for comparison.
        expect(from).to.be(new Date(JAN_01_2014).toISOString());
        // Set to a baseline timezone for comparison.
        expect(to).to.be(new Date(JAN_01_2014 + DAY_IN_MS).toISOString());
      });
    });

    describe('date field is not index pattern timefield', () => {
      let dateEvent;
      const dateField = {
        name: 'anotherTimeField',
        type: 'date'
      };

      beforeEach(() => {
        dateEvent = _.cloneDeep(baseEvent);
        dateEvent.aggConfigs[0].params.field = dateField;
        dateEvent.data.ordered = { date: true };
      });

      test('creates a new range filter', () => {
        const event = _.cloneDeep(dateEvent);
        const rangeBegin = JAN_01_2014;
        const rangeEnd = rangeBegin + DAY_IN_MS;
        event.range = [rangeBegin, rangeEnd];
        onBrushEvent(event, $state);
        expect($state)
          .to.have.property('$newFilters');
        expect($state.filters.length)
          .to.equal(0);
        expect($state.$newFilters.length)
          .to.equal(1);
        expect($state.$newFilters[0].range.anotherTimeField.gte)
          .to.equal(moment(rangeBegin).toISOString());
        expect($state.$newFilters[0].range.anotherTimeField.lt)
          .to.equal(moment(rangeEnd).toISOString());
        expect($state.$newFilters[0].range.anotherTimeField).to.have.property('format');
        expect($state.$newFilters[0].range.anotherTimeField.format)
          .to.equal('strict_date_optional_time');
      });
    });
  });

  describe('handles an event when the x-axis field is a number', () => {
    let numberEvent;
    const numberField = {
      name: 'numberField',
      type: 'number'
    };

    beforeEach(() => {
      numberEvent = _.cloneDeep(baseEvent);
      numberEvent.aggConfigs[0].params.field = numberField;
      numberEvent.data.ordered = { date: false };
    });

    test('by ignoring the event when range does not span at least 2 values', () => {
      const event = _.cloneDeep(numberEvent);
      event.range = [1];
      onBrushEvent(event, $state);
      expect($state).not.have.property('$newFilters');
    });

    test('by creating a new filter', () => {
      const event = _.cloneDeep(numberEvent);
      event.range = [1, 2, 3, 4];
      onBrushEvent(event, $state);
      expect($state)
        .to.have.property('$newFilters');
      expect($state.filters.length)
        .to.equal(0);
      expect($state.$newFilters.length)
        .to.equal(1);
      expect($state.$newFilters[0].range.numberField.gte)
        .to.equal(1);
      expect($state.$newFilters[0].range.numberField.lt)
        .to.equal(4);
      expect($state.$newFilters[0].range.numberField).not.to.have.property('format');
    });

    test('by updating the existing range filter', () => {
      const event = _.cloneDeep(numberEvent);
      event.range = [3, 7];
      $state.filters.push({
        meta: {
          key: 'numberField'
        },
        range: { gte: 1, lt: 4 }
      });
      onBrushEvent(event, $state);
      expect($state)
        .not.have.property('$newFilters');
      expect($state.filters.length)
        .to.equal(1);
      expect($state.filters[0].range.numberField.gte)
        .to.equal(3);
      expect($state.filters[0].range.numberField.lt)
        .to.equal(7);
    });

    test('by updating the existing scripted filter', () => {
      const event = _.cloneDeep(numberEvent);
      event.range = [3, 7];
      event.aggConfigs[0].params.field.scripted = true;
      $state.filters.push({
        meta: {
          key: 'numberField'
        },
        script: {
          script: {
            params: {
              gte: 1,
              lt: 4
            }
          }
        }
      });
      onBrushEvent(event, $state);
      expect($state)
        .not.have.property('$newFilters');
      expect($state.filters.length)
        .to.equal(1);
      expect($state.filters[0].script.script.params.gte)
        .to.equal(3);
      expect($state.filters[0].script.script.params.lt)
        .to.equal(7);
    });
  });
});
