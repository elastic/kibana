/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSupportedFieldsByMetricType } from './get_supported_fields_by_metric_type';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';

describe('getSupportedFieldsByMetricType', () => {
  const shouldHaveHistogramAndNumbers = (type) =>
    it(`should return numbers and histogram for ${type}`, () => {
      expect(getSupportedFieldsByMetricType(type)).toEqual(['number', 'histogram']);
    });
  const shouldSupportAllFieldTypes = (type) =>
    it(`should return all field types for ${type}`, () => {
      expect(getSupportedFieldsByMetricType(type)).toEqual(Object.values(KBN_FIELD_TYPES));
    });
  const shouldHaveOnlyNumbers = (type) =>
    it(`should return only numbers for ${type}`, () => {
      expect(getSupportedFieldsByMetricType(type)).toEqual(['number']);
    });

  shouldSupportAllFieldTypes('value_count');
  shouldHaveHistogramAndNumbers('avg');
  shouldHaveHistogramAndNumbers('sum');
  shouldHaveHistogramAndNumbers('min');
  shouldHaveHistogramAndNumbers('max');

  shouldHaveOnlyNumbers('positive_rate');
  shouldHaveOnlyNumbers('std_deviation');

  it(`should return everything but histogram for cardinality`, () => {
    expect(getSupportedFieldsByMetricType('cardinality')).not.toContain('histogram');
  });
});
