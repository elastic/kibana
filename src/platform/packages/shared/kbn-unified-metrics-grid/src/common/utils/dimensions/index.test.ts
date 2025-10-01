/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { categorizeDimensions, sortDimensions } from '.';
import { ES_FIELD_TYPES } from '@kbn/field-types';

describe('dimension_utils', () => {
  const dimensions = [
    { name: 'resource.attributes.cloud.region', type: ES_FIELD_TYPES.KEYWORD },
    { name: 'attributes.state', type: ES_FIELD_TYPES.KEYWORD },
    { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
    { name: 'cpu.core', type: ES_FIELD_TYPES.LONG },
    { name: 'attributes.region', type: ES_FIELD_TYPES.KEYWORD },
    { name: 'memory.type', type: ES_FIELD_TYPES.KEYWORD },
    { name: 'cpu.arch', type: ES_FIELD_TYPES.KEYWORD },
  ];

  describe('categorizeDimensions', () => {
    it('should categorize required and optional dimensions correctly', () => {
      const metricName = 'cpu.usage';
      const { requiredDimensions, optionalDimensions } = categorizeDimensions(
        dimensions,
        metricName
      );

      expect(requiredDimensions).toEqual([
        { name: 'attributes.state', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'cpu.core', type: ES_FIELD_TYPES.LONG },
        { name: 'attributes.region', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'cpu.arch', type: ES_FIELD_TYPES.KEYWORD },
      ]);
      expect(optionalDimensions).toEqual([
        { name: 'resource.attributes.cloud.region', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'memory.type', type: ES_FIELD_TYPES.KEYWORD },
      ]);
    });

    it('should handle empty dimensions', () => {
      const metricName = 'cpu.usage';
      const { requiredDimensions, optionalDimensions } = categorizeDimensions([], metricName);
      expect(requiredDimensions).toEqual([]);
      expect(optionalDimensions).toEqual([]);
    });
  });

  describe('sortDimensions', () => {
    it('should sort dimensions by priority and name', () => {
      const metricName = 'cpu.usage';
      const sorted = sortDimensions(dimensions, metricName);
      expect(sorted).toEqual([
        { name: 'attributes.region', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'attributes.state', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'cpu.arch', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'cpu.core', type: ES_FIELD_TYPES.LONG },
        { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'memory.type', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'resource.attributes.cloud.region', type: ES_FIELD_TYPES.KEYWORD },
      ]);
    });

    it('should handle empty dimensions', () => {
      const metricName = 'cpu.usage';
      const sorted = sortDimensions([], metricName);
      expect(sorted).toEqual([]);
    });
  });
});
