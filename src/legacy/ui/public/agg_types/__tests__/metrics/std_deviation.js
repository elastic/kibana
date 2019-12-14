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
import { stdDeviationMetricAgg } from '../../metrics/std_deviation';
import { VisProvider } from '../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('AggTypeMetricStandardDeviationProvider class', function() {
  let Vis;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    })
  );

  it('uses the custom label if it is set', function() {
    const vis = new Vis(indexPattern, {});

    // Grab the aggConfig off the vis (we don't actually use the vis for
    // anything else)
    const aggConfig = vis.aggs.aggs[0];
    aggConfig.params.customLabel = 'custom label';
    aggConfig.params.field = {
      displayName: 'memory',
    };

    const responseAggs = stdDeviationMetricAgg.getResponseAggs(aggConfig);
    const lowerStdDevLabel = responseAggs[0].makeLabel();
    const upperStdDevLabel = responseAggs[1].makeLabel();

    expect(lowerStdDevLabel).to.be('Lower custom label');
    expect(upperStdDevLabel).to.be('Upper custom label');
  });

  it('uses the default labels if custom label is not set', function() {
    const vis = new Vis(indexPattern, {});

    // Grab the aggConfig off the vis (we don't actually use the vis for
    // anything else)
    const aggConfig = vis.aggs.aggs[0];
    aggConfig.params.field = {
      displayName: 'memory',
    };

    const responseAggs = stdDeviationMetricAgg.getResponseAggs(aggConfig);
    const lowerStdDevLabel = responseAggs[0].makeLabel();
    const upperStdDevLabel = responseAggs[1].makeLabel();

    expect(lowerStdDevLabel).to.be('Lower Standard Deviation of memory');
    expect(upperStdDevLabel).to.be('Upper Standard Deviation of memory');
  });
});
