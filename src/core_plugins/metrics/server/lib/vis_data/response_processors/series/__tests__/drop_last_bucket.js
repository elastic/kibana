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

import { expect } from 'chai';
import { dropLastBucket } from '../drop_last_bucket';

describe('dropLastBucket(resp, panel, series)', () => {
  let panel;
  let series;
  let resp;

  beforeEach(() => {
    panel = {
      time_field: 'timestamp',
      mode: 'last',
      interval: '1m'
    };
    series = {
      id: 'test',
      chart_type: 'line',
      stacked: false,
      line_width: 1,
      point_size: 1,
      fill: 0,
      color: '#F00',
      split_mode: 'everything',
      metrics: [{
        id: 'stddev',
        mode: 'raw',
        type: 'std_deviation',
        field: 'cpu'
      }]
    };
    resp = {
      aggregations: {
        test: {
          meta: {
            bucketSize: 60,
            from: '2018-01-01T07:26:00.000Z',
            intervalString: '1m',
            timeField: '@timestamp',
            to: '2018-01-01T07:31:00.000Z',
          }
        }
      }
    };
  });


  it('should drop the last partial bucktet', () => {
    const next = value => value;
    const results = [
      {
        data: [
          [ 1514791500000, 0 ],
          [ 1514791560000, 0 ],
          [ 1514791620000, 0 ],
          [ 1514791680000, 0 ],
          [ 1514791740000, 0 ],
          [ 1514791800000, 0 ],
          [ 1514791860000, 0 ]
        ]
      }
    ];
    const data = dropLastBucket(resp, panel, series)(next)(results);
    expect(data).to.eql([
      {
        data: [
          [ 1514791560000, 0 ],
          [ 1514791620000, 0 ],
          [ 1514791680000, 0 ],
          [ 1514791740000, 0 ],
          [ 1514791800000, 0 ]
        ]
      }
    ]);
  });

});

