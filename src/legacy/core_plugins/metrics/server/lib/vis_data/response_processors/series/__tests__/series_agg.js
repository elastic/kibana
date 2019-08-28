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

import { seriesAgg } from '../series_agg';
import { stdMetric } from '../std_metric';
import { expect } from 'chai';
import sinon from 'sinon';

describe('seriesAgg(resp, panel, series)', () => {
  let panel;
  let series;
  let resp;
  beforeEach(() => {
    panel = {
      time_field: 'timestamp',
    };
    series = {
      chart_type: 'line',
      stacked: false,
      line_width: 1,
      point_size: 1,
      fill: 0,
      color: '#F00',
      id: 'test',
      label: 'Total CPU',
      split_mode: 'terms',
      metrics: [
        {
          id: 'avgcpu',
          type: 'avg',
          field: 'cpu',
        },
        {
          id: 'seriesgg',
          type: 'series_agg',
          function: 'sum',
        },
      ],
    };
    resp = {
      aggregations: {
        test: {
          buckets: [
            {
              key: 'example-01',
              timeseries: {
                buckets: [
                  {
                    key: 1,
                    avgcpu: { value: 0.25 },
                  },
                  {
                    key: 2,
                    avgcpu: { value: 0.25 },
                  },
                ],
              },
            },
            {
              key: 'example-02',
              timeseries: {
                buckets: [
                  {
                    key: 1,
                    avgcpu: { value: 0.25 },
                  },
                  {
                    key: 2,
                    avgcpu: { value: 0.25 },
                  },
                ],
              },
            },
          ],
        },
      },
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    seriesAgg(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
  });

  it('creates a series', () => {
    const next = seriesAgg(resp, panel, series)(results => results);
    const results = stdMetric(resp, panel, series)(next)([]);
    expect(results).to.have.length(1);

    expect(results[0]).to.eql({
      id: 'test',
      color: '#F00',
      label: 'Total CPU',
      stack: false,
      lines: { show: true, fill: 0, lineWidth: 1, steps: false },
      points: { show: true, radius: 1, lineWidth: 1 },
      bars: { fill: 0, lineWidth: 1, show: false },
      data: [[1, 0.5], [2, 0.5]],
    });
  });
});
