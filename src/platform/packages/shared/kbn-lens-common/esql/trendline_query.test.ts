/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildTrendlineBucketExpression, appendTimeBucketToEsqlQuery } from './trendline_query';

describe('buildTrendlineBucketExpression', () => {
  it('builds a BUCKET expression', () => {
    expect(buildTrendlineBucketExpression('timestamp')).toBe(
      'BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('works with dotted field names', () => {
    expect(buildTrendlineBucketExpression('order.date')).toBe(
      'BUCKET(order.date, 75, ?_tstart, ?_tend)'
    );
  });
});

describe('appendTimeBucketToEsqlQuery', () => {
  it('appends STATS COUNT(*) BY when query has no STATS', () => {
    expect(appendTimeBucketToEsqlQuery('FROM index', 'timestamp')).toBe(
      'FROM index | STATS COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('appends BY when query has STATS without BY', () => {
    expect(appendTimeBucketToEsqlQuery('FROM index | STATS AVG(price)', 'timestamp')).toBe(
      'FROM index | STATS AVG(price) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('appends to existing BY clause', () => {
    expect(
      appendTimeBucketToEsqlQuery('FROM index | STATS AVG(price) BY category', 'timestamp')
    ).toBe('FROM index | STATS AVG(price) BY category, BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('is case-insensitive for STATS and BY keywords', () => {
    expect(
      appendTimeBucketToEsqlQuery('FROM index | stats avg(price) by region', '@timestamp')
    ).toBe('FROM index | stats avg(price) by region, BUCKET(@timestamp, 75, ?_tstart, ?_tend)');
  });

  it('handles WHERE clause before STATS', () => {
    expect(
      appendTimeBucketToEsqlQuery(
        'FROM index | WHERE status >= ?_tstart AND status <= ?_tend | STATS MEDIAN(bytes)',
        'timestamp'
      )
    ).toBe(
      'FROM index | WHERE status >= ?_tstart AND status <= ?_tend | STATS MEDIAN(bytes) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });
});
