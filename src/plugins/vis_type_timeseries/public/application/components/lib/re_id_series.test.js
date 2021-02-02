/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import uuid from 'uuid';

import { reIdSeries } from './re_id_series';

describe('reIdSeries()', () => {
  test('reassign ids for series with just basic metrics', () => {
    const series = {
      id: uuid.v1(),
      metrics: [{ id: uuid.v1() }, { id: uuid.v1() }],
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).not.toEqual(series);
    expect(newSeries.id).not.toEqual(series.id);
    newSeries.metrics.forEach((val, key) => {
      expect(val.id).not.toEqual(series.metrics[key].id);
    });
  });

  test('reassign ids for series with just basic metrics and group by', () => {
    const firstMetricId = uuid.v1();
    const series = {
      id: uuid.v1(),
      metrics: [{ id: firstMetricId }, { id: uuid.v1() }],
      terms_order_by: firstMetricId,
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).not.toEqual(series);
    expect(newSeries.id).not.toEqual(series.id);
    newSeries.metrics.forEach((val, key) => {
      expect(val.id).not.toEqual(series.metrics[key].id);
    });
    expect(newSeries.terms_order_by).toEqual(newSeries.metrics[0].id);
  });

  test('reassign ids for series with pipeline metrics', () => {
    const firstMetricId = uuid.v1();
    const series = {
      id: uuid.v1(),
      metrics: [{ id: firstMetricId }, { id: uuid.v1(), field: firstMetricId }],
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).not.toEqual(series);
    expect(newSeries.id).not.toEqual(series.id);
    expect(newSeries.metrics[0].id).toEqual(newSeries.metrics[1].field);
  });

  test('reassign ids for series with calculation vars', () => {
    const firstMetricId = uuid.v1();
    const series = {
      id: uuid.v1(),
      metrics: [
        { id: firstMetricId },
        {
          id: uuid.v1(),
          type: 'calculation',
          variables: [{ id: uuid.v1(), field: firstMetricId }],
        },
      ],
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).not.toEqual(series);
    expect(newSeries.id).not.toEqual(series.id);
    expect(newSeries.metrics[1].variables[0].field).toEqual(newSeries.metrics[0].id);
  });
});
