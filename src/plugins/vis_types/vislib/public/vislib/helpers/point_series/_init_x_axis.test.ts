/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import type { DateHistogramParams, HistogramParams } from '@kbn/visualizations-plugin/public';

import { initXAxis } from './_init_x_axis';
import { makeFakeXAspect } from './_fake_x_aspect';
import { Aspects, Chart, DateHistogramOrdered, HistogramOrdered } from './point_series';
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
    dateHistogramParams.interval = moment.duration(1, 'd').asMilliseconds();
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
