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

import sinon from 'sinon';
import { expect } from 'chai';
import { timeShift } from '../time_shift';
import { stdMetric } from '../std_metric';

describe('timeShift(resp, panel, series)', () => {
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
      offset_time: '1h',
      point_size: 1,
      fill: 0,
      color: '#F00',
      id: 'test',
      split_mode: 'everything',
      metrics: [{ id: 'avgmetric', type: 'avg', field: 'cpu' }],
    };
    resp = {
      aggregations: {
        test: {
          timeseries: {
            buckets: [
              {
                key: 1483225200000,
                avgmetric: { value: 1 },
              },
              {
                key: 1483225210000,
                avgmetric: { value: 2 },
              },
            ],
          },
        },
      },
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    timeShift(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
  });

  it('creates a series', () => {
    const next = timeShift(resp, panel, series)(results => results);
    const results = stdMetric(resp, panel, series)(next)([]);
    expect(results).to.have.length(1);
    expect(results[0]).to.have.property('color', 'rgb(255, 0, 0)');
    expect(results[0]).to.have.property('id', 'test');
    expect(results[0]).to.have.property('label', 'Average of cpu');
    expect(results[0]).to.have.property('lines');
    expect(results[0]).to.have.property('stack');
    expect(results[0]).to.have.property('bars');
    expect(results[0]).to.have.property('points');
    expect(results[0].data).to.eql([[1483225200000 + 3600000, 1], [1483225210000 + 3600000, 2]]);
  });
});
