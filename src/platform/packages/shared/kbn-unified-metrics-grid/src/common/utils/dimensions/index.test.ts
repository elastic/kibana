/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { categorizeDimensions, sortDimensions } from '.';

describe('dimension_utils', () => {
  const dimensions = [
    { name: 'resource.attributes.cloud.region', type: 'keyword' },
    { name: 'attributes.state', type: 'keyword' },
    { name: 'host.name', type: 'string' },
    { name: 'cpu.core', type: 'number' },
    { name: 'attributes.region', type: 'string' },
    { name: 'memory.type', type: 'string' },
    { name: 'cpu.arch', type: 'string' },
  ];

  describe('categorizeDimensions', () => {
    it('should categorize required and optional dimensions correctly', () => {
      const metricName = 'cpu.usage';
      const { requiredDimensions, optionalDimensions } = categorizeDimensions(
        dimensions,
        metricName
      );

      expect(requiredDimensions).toEqual([
        { name: 'attributes.state', type: 'keyword' },
        { name: 'cpu.core', type: 'number' },
        { name: 'attributes.region', type: 'string' },
        { name: 'cpu.arch', type: 'string' },
      ]);
      expect(optionalDimensions).toEqual([
        { name: 'resource.attributes.cloud.region', type: 'keyword' },
        { name: 'host.name', type: 'string' },
        { name: 'memory.type', type: 'string' },
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
        { name: 'attributes.region', type: 'string' },
        { name: 'attributes.state', type: 'keyword' },
        { name: 'cpu.arch', type: 'string' },
        { name: 'cpu.core', type: 'number' },
        { name: 'host.name', type: 'string' },
        { name: 'memory.type', type: 'string' },
        { name: 'resource.attributes.cloud.region', type: 'keyword' },
      ]);
    });

    it('should handle empty dimensions', () => {
      const metricName = 'cpu.usage';
      const sorted = sortDimensions([], metricName);
      expect(sorted).toEqual([]);
    });
  });
});
