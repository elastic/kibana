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

import expect from '@kbn/expect';
import moment from 'moment';
import { initXAxis } from '../_init_x_axis';
import { makeFakeXAspect } from '../_fake_x_aspect';

describe('initXAxis', function () {
  let chart;
  let table;

  beforeEach(function () {
    chart = {
      aspects: {
        x: [{
          ...makeFakeXAspect(),
          accessor: 0,
          title: 'label',
        }],
      }
    };

    table = {
      columns: [{ id: '0' }],
      rows: [
        { '0': 'hello' },
        { '0': 'world' },
        { '0': 'foo' },
        { '0': 'bar' },
        { '0': 'baz' },
      ],
    };
  });

  it('sets the xAxisFormatter if the agg is not ordered', function () {
    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormat', chart.aspects.x[0].format);
  });

  it('makes the chart ordered if the agg is ordered', function () {
    chart.aspects.x[0].params.interval = 10;

    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormat', chart.aspects.x[0].format)
      .and.have.property('ordered');
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
          { '0': 'hello' },
          { '0': 'world' },
          { '0': 'hello' },
          { '0': 'world' },
          { '0': 'foo' },
          { '0': 'bar' },
          { '0': 'baz' },
          { '0': 'hello' },
        ],
      };
      initXAxis(chart, table);
      expect(chart.xAxisOrderedValues).to.eql(['hello', 'world', 'foo', 'bar', 'baz']);
    });

    it('returns the defaultValue if using fake x aspect', function () {
      chart = {
        aspects: {
          x: [makeFakeXAspect()],
        }
      };
      initXAxis(chart, table);
      expect(chart.xAxisOrderedValues).to.eql(['_all']);
    });
  });

  it('reads the date interval param from the x agg', function () {
    chart.aspects.x[0].params.interval = 'P1D';
    chart.aspects.x[0].params.intervalESValue = 1;
    chart.aspects.x[0].params.intervalESUnit = 'd';
    chart.aspects.x[0].params.date = true;
    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormat', chart.aspects.x[0].format)
      .and.have.property('ordered');

    expect(moment.isDuration(chart.ordered.interval)).to.be(true);
    expect(chart.ordered.interval.toISOString()).to.eql('P1D');
    expect(chart.ordered.intervalESValue).to.be(1);
    expect(chart.ordered.intervalESUnit).to.be('d');
  });

  it('reads the numeric interval param from the x agg', function () {
    chart.aspects.x[0].params.interval = 0.5;
    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormat', chart.aspects.x[0].format)
      .and.have.property('ordered');

    expect(chart.ordered.interval).to.eql(0.5);
  });
});
