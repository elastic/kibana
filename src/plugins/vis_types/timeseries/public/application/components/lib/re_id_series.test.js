/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';

import { reIdSeries } from './re_id_series';

describe('reIdSeries()', () => {
  test('reassign ids for series with just basic metrics', () => {
    const series = {
      id: uuidv4(),
      metrics: [{ id: uuidv4() }, { id: uuidv4() }],
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).not.toEqual(series);
    expect(newSeries.id).not.toEqual(series.id);
    newSeries.metrics.forEach((val, key) => {
      expect(val.id).not.toEqual(series.metrics[key].id);
    });
  });

  test('reassign ids for series with just basic metrics and group by', () => {
    const firstMetricId = uuidv4();
    const series = {
      id: uuidv4(),
      metrics: [{ id: firstMetricId }, { id: uuidv4() }],
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
    const firstMetricId = uuidv4();
    const series = {
      id: uuidv4(),
      metrics: [{ id: firstMetricId }, { id: uuidv4(), field: firstMetricId }],
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).not.toEqual(series);
    expect(newSeries.id).not.toEqual(series.id);
    expect(newSeries.metrics[0].id).toEqual(newSeries.metrics[1].field);
  });

  test('reassign ids for series with calculation vars', () => {
    const firstMetricId = uuidv4();
    const series = {
      id: uuidv4(),
      metrics: [
        { id: firstMetricId },
        {
          id: uuidv4(),
          type: 'calculation',
          variables: [{ id: uuidv4(), field: firstMetricId }],
        },
      ],
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).not.toEqual(series);
    expect(newSeries.id).not.toEqual(series.id);
    expect(newSeries.metrics[1].variables[0].field).toEqual(newSeries.metrics[0].id);
  });
});
