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
