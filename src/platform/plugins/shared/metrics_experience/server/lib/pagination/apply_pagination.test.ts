/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyPagination } from './apply_pagination';

describe('applyPagination', () => {
  const metricFields = [
    { name: 'metric1' },
    { name: 'metric2' },
    { name: 'metric3' },
    { name: 'metric4' },
    { name: 'metric5' },
    { name: 'metric6' },
    { name: 'metric7' },
    { name: 'metric8' },
    { name: 'metric9' },
    { name: 'metric10' },
  ];

  it('should return the first page of results', () => {
    const result = applyPagination({
      metricFields,
      page: 1,
      size: 5,
    });
    expect(result).toEqual([
      { name: 'metric1' },
      { name: 'metric2' },
      { name: 'metric3' },
      { name: 'metric4' },
      { name: 'metric5' },
    ]);
  });

  it('should return a middle page of results', () => {
    const result = applyPagination({
      metricFields,
      page: 2,
      size: 3,
    });
    expect(result).toEqual([{ name: 'metric4' }, { name: 'metric5' }, { name: 'metric6' }]);
  });

  it('should return the last page of results', () => {
    const result = applyPagination({
      metricFields,
      page: 4,
      size: 3,
    });
    expect(result).toEqual([{ name: 'metric10' }]);
  });

  it('should return an empty array for an out-of-bounds page', () => {
    const result = applyPagination({
      metricFields,
      page: 5,
      size: 3,
    });
    expect(result).toEqual([]);
  });

  it('should return an empty array when the input array is empty', () => {
    const result = applyPagination({
      metricFields: [],
      page: 1,
      size: 5,
    });
    expect(result).toEqual([]);
  });

  it('should handle a page size larger than the array', () => {
    const result = applyPagination({
      metricFields,
      page: 1,
      size: 20,
    });
    expect(result).toEqual(metricFields);
  });

  it('should handle a page size of 1', () => {
    const result = applyPagination({
      metricFields,
      page: 3,
      size: 1,
    });
    expect(result).toEqual([{ name: 'metric3' }]);
  });
});
