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

import { stdSibling } from '../std_sibling';
import { expect } from 'chai';
import sinon from 'sinon';

describe('stdSibling(resp, panel, series)', () => {
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
      color: 'rgb(255, 0, 0)',
      id: 'test',
      split_mode: 'everything',
      metrics: [
        {
          id: 'avgcpu',
          type: 'avg',
          field: 'cpu',
        },
        {
          id: 'sib',
          type: 'std_deviation_bucket',
          field: 'avgcpu',
        },
      ],
    };
    resp = {
      aggregations: {
        test: {
          sib: {
            std_deviation: 0.23,
          },
          timeseries: {
            buckets: [
              {
                key: 1,
                avgcpu: { value: 0.23 },
              },
              {
                key: 2,
                avgcpu: { value: 0.22 },
              },
            ],
          },
        },
      },
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    stdSibling(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
  });

  it('calls next when std. deviation bands set', () => {
    series.metrics[1].mode = 'band';
    const next = sinon.spy(results => results);
    const results = stdSibling(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
    expect(results).to.have.length(0);
  });

  it('creates a series', () => {
    const next = results => results;
    const results = stdSibling(resp, panel, series)(next)([]);
    expect(results).to.have.length(1);

    expect(results[0]).to.eql({
      id: 'test',
      label: 'Overall Std. Deviation of Average of cpu',
      color: 'rgb(255, 0, 0)',
      stack: false,
      seriesId: 'test',
      lines: { show: true, fill: 0, lineWidth: 1, steps: false },
      points: { show: true, radius: 1, lineWidth: 1 },
      bars: { fill: 0, lineWidth: 1, show: false },
      data: [
        [1, 0.23],
        [2, 0.23],
      ],
    });
  });
});
