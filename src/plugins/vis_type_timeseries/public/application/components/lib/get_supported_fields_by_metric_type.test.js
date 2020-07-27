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

import { getSupportedFieldsByMetricType } from './get_supported_fields_by_metric_type';

describe('getSupportedFieldsByMetricType', () => {
  const shouldHaveHistogramAndNumbers = (type) =>
    it(`should return numbers and histogram for ${type}`, () => {
      expect(getSupportedFieldsByMetricType(type)).toEqual(['number', 'histogram']);
    });
  const shouldHaveOnlyNumbers = (type) =>
    it(`should return only numbers for ${type}`, () => {
      expect(getSupportedFieldsByMetricType(type)).toEqual(['number']);
    });

  shouldHaveHistogramAndNumbers('value_count');
  shouldHaveHistogramAndNumbers('avg');
  shouldHaveHistogramAndNumbers('sum');

  shouldHaveOnlyNumbers('positive_rate');
  shouldHaveOnlyNumbers('std_deviation');
  shouldHaveOnlyNumbers('max');
  shouldHaveOnlyNumbers('min');

  it(`should return everything but histogram for cardinality`, () => {
    expect(getSupportedFieldsByMetricType('cardinality')).not.toContain('histogram');
  });
});
