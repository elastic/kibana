/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deduplicateFields } from './deduplicate_fields';
import type { MetricField } from '../../../common/types';

describe('deduplicateFields', () => {
  const baseField: Omit<MetricField, 'name'> = {
    index: 'test-index',
    dimensions: [],
    type: 'double',
    instrument: 'gauge',
  };

  it('should prefer the non-prefixed field when the prefixed one comes first', () => {
    const fields: MetricField[] = [
      { ...baseField, name: 'metrics.cpu' },
      { ...baseField, name: 'cpu' },
    ];
    const result = deduplicateFields(fields);
    expect(result).toEqual([{ ...baseField, name: 'cpu' }]);
  });

  it('should prefer the non-prefixed field when the non-prefixed one comes first', () => {
    const fields: MetricField[] = [
      { ...baseField, name: 'cpu' },
      { ...baseField, name: 'metrics.cpu' },
    ];
    const result = deduplicateFields(fields);
    expect(result).toEqual([{ ...baseField, name: 'cpu' }]);
  });

  it('should handle multiple duplicates', () => {
    const fields: MetricField[] = [
      { ...baseField, name: 'metrics.cpu' },
      { ...baseField, name: 'cpu' },
      { ...baseField, name: 'metrics.memory' },
      { ...baseField, name: 'memory' },
    ];
    const result = deduplicateFields(fields);
    expect(result).toEqual([
      { ...baseField, name: 'cpu' },
      { ...baseField, name: 'memory' },
    ]);
  });

  it('should keep fields that are not duplicated', () => {
    const fields: MetricField[] = [
      { ...baseField, name: 'metrics.cpu' },
      { ...baseField, name: 'cpu' },
      { ...baseField, name: 'disk.io' },
    ];
    const result = deduplicateFields(fields);
    expect(result).toEqual([
      { ...baseField, name: 'cpu' },
      { ...baseField, name: 'disk.io' },
    ]);
  });

  it('should keep the prefixed field if no non-prefixed version exists, and strip the prefix', () => {
    const fields: MetricField[] = [{ ...baseField, name: 'metrics.network.in' }];
    const result = deduplicateFields(fields);
    expect(result).toEqual([{ ...baseField, name: 'network.in' }]);
  });

  it('should return an empty array if the input is empty', () => {
    const fields: MetricField[] = [];
    const result = deduplicateFields(fields);
    expect(result).toEqual([]);
  });

  it('should handle a mix of prefixed and non-prefixed fields', () => {
    const fields: MetricField[] = [
      { ...baseField, name: 'metrics.cpu' },
      { ...baseField, name: 'cpu' },
      { ...baseField, name: 'metrics.memory' },
      { ...baseField, name: 'disk.io' },
    ];
    const result = deduplicateFields(fields);
    expect(result).toEqual([
      { ...baseField, name: 'cpu' },
      { ...baseField, name: 'memory' },
      { ...baseField, name: 'disk.io' },
    ]);
  });

  it('should handle fields with the same name but different indices', () => {
    const fields: MetricField[] = [
      { ...baseField, name: 'cpu', index: 'test-index-1' },
      { ...baseField, name: 'cpu', index: 'test-index-2' },
    ];
    const result = deduplicateFields(fields);
    expect(result).toEqual([
      { ...baseField, name: 'cpu', index: 'test-index-1' },
      { ...baseField, name: 'cpu', index: 'test-index-2' },
    ]);
  });
});
