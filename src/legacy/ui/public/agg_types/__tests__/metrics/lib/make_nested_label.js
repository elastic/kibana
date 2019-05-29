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
import { makeNestedLabel } from '../../../metrics/lib/make_nested_label';

describe('metric agg make_nested_label', function () {

  function generateAggConfig(metricLabel) {
    return {
      params: {
        customMetric: {
          makeLabel: () => { return metricLabel; }
        }
      }
    };
  }

  it('should return a metric label with prefix', function () {
    const aggConfig = generateAggConfig('Count');
    const label = makeNestedLabel(aggConfig, 'derivative');
    expect(label).to.eql('Derivative of Count');
  });

  it('should return a numbered prefix', function () {
    const aggConfig = generateAggConfig('Derivative of Count');
    const label = makeNestedLabel(aggConfig, 'derivative');
    expect(label).to.eql('2. derivative of Count');
  });

  it('should return a prefix with correct order', function () {
    const aggConfig = generateAggConfig('3. derivative of Count');
    const label = makeNestedLabel(aggConfig, 'derivative');
    expect(label).to.eql('4. derivative of Count');
  });

});
