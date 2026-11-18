/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregatedOperator } from './types';
import { operatorCategory, summarizeCpuByCategory } from './operator_category';

const operator = (title: string, processNanos: number, timeReported = true) =>
  ({ title, processNanos, timeReported } as AggregatedOperator);

describe('operatorCategory', () => {
  it('groups operators by the kind of work they do', () => {
    expect(operatorCategory('HashAggregation')).toBe('aggregate_and_sort');
    expect(operatorCategory('TopN')).toBe('aggregate_and_sort');
    expect(operatorCategory('ValuesSourceReader')).toBe('read');
    expect(operatorCategory('LuceneSource')).toBe('read');
    expect(operatorCategory('Eval')).toBe('compute');
    expect(operatorCategory('Limit')).toBe('filter_and_limit');
    expect(operatorCategory('ExchangeSink')).toBe('exchange');
    expect(operatorCategory('Output')).toBe('other');
  });
});

describe('summarizeCpuByCategory', () => {
  it('sums operator time by category and returns shares in a stable order', () => {
    const breakdown = summarizeCpuByCategory([
      operator('HashAggregation', 3),
      operator('ValuesSourceReader', 4),
      operator('LuceneSource', 1),
      operator('Eval', 2),
    ]);

    expect(breakdown).toEqual([
      { category: 'read', nanos: 5, share: 0.5 },
      { category: 'compute', nanos: 2, share: 0.2 },
      { category: 'aggregate_and_sort', nanos: 3, share: 0.3 },
    ]);
  });

  it('leaves out operators that report no time', () => {
    expect(
      summarizeCpuByCategory([operator('ExchangeSink', 0, false), operator('Eval', 5)])
    ).toEqual([{ category: 'compute', nanos: 5, share: 1 }]);
  });

  it('returns nothing when no operator reports time', () => {
    expect(summarizeCpuByCategory([operator('Output', 0, false)])).toEqual([]);
  });
});
