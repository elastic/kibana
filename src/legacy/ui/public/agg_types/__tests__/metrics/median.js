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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { VisProvider } from '../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('AggTypeMetricMedianProvider class', function() {
  let indexPattern;
  let aggDsl;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(Private) {
      const Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

      const vis = new Vis(indexPattern, {
        title: 'New Visualization',
        type: 'metric',
        params: {
          fontSize: 60,
        },
        aggs: [
          {
            id: '1',
            type: 'median',
            schema: 'metric',
            params: {
              field: 'bytes',
              percents: [50],
            },
          },
        ],
        listeners: {},
      });

      // Grab the aggConfig off the vis (we don't actually use the vis for
      // anything else)
      const aggConfig = vis.aggs.aggs[0];
      aggDsl = aggConfig.toDsl();
    })
  );

  it('requests the percentiles aggregation in the Elasticsearch query DSL', function() {
    expect(Object.keys(aggDsl)[0]).to.be('percentiles');
  });

  it('asks Elasticsearch for the 50th percentile', function() {
    expect(aggDsl.percentiles.percents).to.eql([50]);
  });

  it('asks Elasticsearch for array-based values in the aggregation response', function() {
    expect(aggDsl.percentiles.keyed).to.be(false);
  });
});
