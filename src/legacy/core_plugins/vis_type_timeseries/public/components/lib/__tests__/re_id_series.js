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
import { expect } from 'chai';
import { reIdSeries } from '../re_id_series';

describe('reIdSeries()', () => {
  it('reassign ids for series with just basic metrics', () => {
    const series = {
      id: uuid.v1(),
      metrics: [{ id: uuid.v1() }, { id: uuid.v1() }],
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).to.not.equal(series);
    expect(newSeries.id).to.not.equal(series.id);
    newSeries.metrics.forEach((val, key) => {
      expect(val.id).to.not.equal(series.metrics[key].id);
    });
  });

  it('reassign ids for series with just basic metrics and group by', () => {
    const firstMetricId = uuid.v1();
    const series = {
      id: uuid.v1(),
      metrics: [{ id: firstMetricId }, { id: uuid.v1() }],
      terms_order_by: firstMetricId,
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).to.not.equal(series);
    expect(newSeries.id).to.not.equal(series.id);
    newSeries.metrics.forEach((val, key) => {
      expect(val.id).to.not.equal(series.metrics[key].id);
    });
    expect(newSeries.terms_order_by).to.equal(newSeries.metrics[0].id);
  });

  it('reassign ids for series with pipeline metrics', () => {
    const firstMetricId = uuid.v1();
    const series = {
      id: uuid.v1(),
      metrics: [{ id: firstMetricId }, { id: uuid.v1(), field: firstMetricId }],
    };
    const newSeries = reIdSeries(series);
    expect(newSeries).to.not.equal(series);
    expect(newSeries.id).to.not.equal(series.id);
    expect(newSeries.metrics[0].id).to.equal(newSeries.metrics[1].field);
  });

  it('reassign ids for series with calculation vars', () => {
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
    expect(newSeries).to.not.equal(series);
    expect(newSeries.id).to.not.equal(series.id);
    expect(newSeries.metrics[1].variables[0].field).to.equal(newSeries.metrics[0].id);
  });
});
