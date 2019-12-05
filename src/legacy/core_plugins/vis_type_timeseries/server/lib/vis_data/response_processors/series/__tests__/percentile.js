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

import { percentile } from '../percentile';
import { expect } from 'chai';
import sinon from 'sinon';

describe('percentile(resp, panel, series)', () => {
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
          id: 'pct',
          type: 'percentile',
          field: 'cpu',
          percentiles: [
            { id: '10-90', mode: 'band', value: 10, percentile: 90, shade: 0.2 },
            { id: '50', mode: 'line', value: 50 },
          ],
        },
      ],
    };
    resp = {
      aggregations: {
        test: {
          timeseries: {
            buckets: [
              {
                key: 1,
                pct: {
                  values: {
                    '10.0': 1,
                    '50.0': 2.5,
                    '90.0': 5,
                  },
                },
              },
              {
                key: 2,
                pct: {
                  values: {
                    '10.0': 1.2,
                    '50.0': 2.7,
                    '90.0': 5.3,
                  },
                },
              },
            ],
          },
        },
      },
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    percentile(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
  });

  it('creates a series', () => {
    const next = results => results;
    const results = percentile(resp, panel, series)(next)([]);
    expect(results).to.have.length(3);

    expect(results[0]).to.have.property('id', 'test:10-90');
    expect(results[0]).to.have.property('color', 'rgb(255, 0, 0)');
    expect(results[0]).to.have.property('fillBetween', 'test:10-90:90');
    expect(results[0]).to.have.property('label', 'Percentile of cpu (10)');
    expect(results[0]).to.have.property('legend', false);
    expect(results[0]).to.have.property('lines');
    expect(results[0].lines).to.eql({
      fill: 0.2,
      lineWidth: 0,
      show: true,
    });
    expect(results[0]).to.have.property('points');
    expect(results[0].points).to.eql({ show: false });
    expect(results[0].data).to.eql([[1, 1], [2, 1.2]]);

    expect(results[1]).to.have.property('id', 'test:10-90:90');
    expect(results[1]).to.have.property('color', 'rgb(255, 0, 0)');
    expect(results[1]).to.have.property('label', 'Percentile of cpu (10)');
    expect(results[1]).to.have.property('legend', false);
    expect(results[1]).to.have.property('lines');
    expect(results[1].lines).to.eql({
      fill: false,
      lineWidth: 0,
      show: true,
    });
    expect(results[1]).to.have.property('points');
    expect(results[1].points).to.eql({ show: false });
    expect(results[1].data).to.eql([[1, 5], [2, 5.3]]);

    expect(results[2]).to.have.property('id', 'test:50');
    expect(results[2]).to.have.property('color', 'rgb(255, 0, 0)');
    expect(results[2]).to.have.property('label', 'Percentile of cpu (50)');
    expect(results[2]).to.have.property('stack', false);
    expect(results[2]).to.have.property('lines');
    expect(results[2].lines).to.eql({
      fill: 0,
      lineWidth: 1,
      show: true,
      steps: false,
    });
    expect(results[2]).to.have.property('bars');
    expect(results[2].bars).to.eql({
      fill: 0,
      lineWidth: 1,
      show: false,
    });
    expect(results[2]).to.have.property('points');
    expect(results[2].points).to.eql({ show: true, lineWidth: 1, radius: 1 });
    expect(results[2].data).to.eql([[1, 2.5], [2, 2.7]]);
  });
});
