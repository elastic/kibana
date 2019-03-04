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
import expect from 'expect.js';
import { initXAxis } from '../_init_x_axis';

describe('initXAxis', function () {

  const field = {};
  const indexPattern = {};
  let chart;
  let table;

  beforeEach(function () {
    chart = {
      aspects: {
        x: {
          aggConfig: {
            fieldFormatter: _.constant({}),
            write: _.constant({ params: {} }),
            aggConfigs: {},
            getIndexPattern: () => {
              return indexPattern;
            },
            type: {}
          },
          title: 'label',
          params: {
            defaultValue: '_all',
          },
          i: 0,
        }
      }
    };

    table = {
      columns: [{ id: '0' }],
      rows: [
        [{ value: 'hello' }],
        [{ value: 'world' }],
        [{ value: 'foo' }],
        [{ value: 'bar' }],
        [{ value: 'baz' }],
      ],
    };
  });

  it('sets the xAxisFormatter if the agg is not ordered', function () {
    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.aggConfig.fieldFormatter());
  });

  it('makes the chart ordered if the agg is ordered', function () {
    chart.aspects.x.aggConfig.type.ordered = true;
    chart.aspects.x.aggConfig.params = {
      field: field
    };
    chart.aspects.x.aggConfig.aggConfigs.indexPattern = indexPattern;

    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.aggConfig.fieldFormatter())
      .and.have.property('indexPattern', indexPattern)
      .and.have.property('xAxisField', field)
      .and.have.property('ordered');

    expect(chart.ordered)
      .to.be.an('object')
      .and.not.have.property('interval');
  });

  describe('xAxisOrderedValues', function () {
    it('sets the xAxisOrderedValues property', function () {
      initXAxis(chart, table);
      expect(chart).to.have.property('xAxisOrderedValues');
    });

    it('returns a list of values, preserving the table order', function () {
      initXAxis(chart, table);
      expect(chart.xAxisOrderedValues).to.eql(['hello', 'world', 'foo', 'bar', 'baz']);
    });

    it('only returns unique values', function () {
      table = {
        columns: [{ id: '0' }],
        rows: [
          [{ value: 'hello' }],
          [{ value: 'world' }],
          [{ value: 'hello' }],
          [{ value: 'world' }],
          [{ value: 'foo' }],
          [{ value: 'bar' }],
          [{ value: 'baz' }],
          [{ value: 'hello' }],
        ],
      };
      initXAxis(chart, table);
      expect(chart.xAxisOrderedValues).to.eql(['hello', 'world', 'foo', 'bar', 'baz']);
    });

    it('returns the defaultValue if using fake x aspect', function () {
      chart.aspects.x.i = -1;
      chart.aspects.x.params.defaultValue = '_all';
      initXAxis(chart, table);
      expect(chart.xAxisOrderedValues).to.eql(['_all']);
    });
  });

  it('reads the interval param from the x agg', function () {
    chart.aspects.x.aggConfig.type.ordered = true;
    chart.aspects.x.aggConfig.write = _.constant({ params: { interval: 10 } });
    chart.aspects.x.aggConfig.params = {
      field: field
    };
    chart.aspects.x.aggConfig.aggConfigs.indexPattern = indexPattern;

    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.aggConfig.fieldFormatter())
      .and.have.property('indexPattern', indexPattern)
      .and.have.property('xAxisField', field)
      .and.have.property('ordered');

    expect(chart.ordered)
      .to.be.an('object')
      .and.have.property('interval', 10);
  });
});
