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
import { initXAxis } from './_init_x_axis';
import { makeFakeXAspect } from './_fake_x_aspect';
import {
  Aspects,
  Chart,
  DateHistogramOrdered,
  DateHistogramParams,
  HistogramOrdered,
  HistogramParams,
} from './point_series';
import { Table, Column } from '../../types';

describe('initXAxis', function () {
  let chart: Chart;
  let table: Table;

  beforeEach(function () {
    chart = {
      aspects: {
        x: [
          {
            ...makeFakeXAspect(),
            accessor: '0',
            title: 'label',
          },
        ],
      } as Aspects,
    } as Chart;

    table = {
      columns: [{ id: '0' } as Column],
      rows: [{ '0': 'hello' }, { '0': 'world' }, { '0': 'foo' }, { '0': 'bar' }, { '0': 'baz' }],
    };
  });

  it('sets the xAxisFormatter if the agg is not ordered', function () {
    initXAxis(chart, table);
    expect(chart).toHaveProperty('xAxisLabel', 'label');
    expect(chart).toHaveProperty('xAxisFormat', chart.aspects.x[0].format);
  });

  it('makes the chart ordered if the agg is ordered', function () {
    (chart.aspects.x[0].params as HistogramParams).interval = 10;

    initXAxis(chart, table);
    expect(chart).toHaveProperty('xAxisLabel', 'label');
    expect(chart).toHaveProperty('xAxisFormat', chart.aspects.x[0].format);
    expect(chart).toHaveProperty('ordered');
  });

  describe('xAxisOrderedValues', function () {
    it('sets the xAxisOrderedValues property', function () {
      initXAxis(chart, table);
      expect(chart).toHaveProperty('xAxisOrderedValues');
    });

    it('returns a list of values, preserving the table order', function () {
      initXAxis(chart, table);
      expect(chart.xAxisOrderedValues).toEqual(['hello', 'world', 'foo', 'bar', 'baz']);
    });

    it('only returns unique values', function () {
      table = {
        columns: [{ id: '0' } as Column],
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
      expect(chart.xAxisOrderedValues).toEqual(['hello', 'world', 'foo', 'bar', 'baz']);
    });

    it('returns the defaultValue if using fake x aspect', function () {
      chart = {
        aspects: {
          x: [makeFakeXAspect()],
        } as Aspects,
      } as Chart;
      initXAxis(chart, table);
      expect(chart.xAxisOrderedValues).toEqual(['_all']);
    });
  });

  it('reads the date interval param from the x agg', function () {
    const dateHistogramParams = chart.aspects.x[0].params as DateHistogramParams;
    dateHistogramParams.interval = 'P1D';
    dateHistogramParams.intervalESValue = 1;
    dateHistogramParams.intervalESUnit = 'd';
    dateHistogramParams.date = true;
    initXAxis(chart, table);
    expect(chart).toHaveProperty('xAxisLabel', 'label');
    expect(chart).toHaveProperty('xAxisFormat', chart.aspects.x[0].format);
    expect(chart).toHaveProperty('ordered');

    expect(chart.ordered).toEqual(expect.any(Object));
    const { intervalESUnit, intervalESValue, interval } = chart.ordered as DateHistogramOrdered;
    expect(moment.isDuration(interval)).toBe(true);
    expect(interval.toISOString()).toEqual('P1D');
    expect(intervalESValue).toBe(1);
    expect(intervalESUnit).toBe('d');
  });

  it('reads the numeric interval param from the x agg', function () {
    (chart.aspects.x[0].params as HistogramParams).interval = 0.5;
    initXAxis(chart, table);
    expect(chart).toHaveProperty('xAxisLabel', 'label');
    expect(chart).toHaveProperty('xAxisFormat', chart.aspects.x[0].format);
    expect(chart).toHaveProperty('ordered');

    expect((chart.ordered as HistogramOrdered).interval).toEqual(0.5);
  });
});
