/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectionToEsqlCondition } from '@kbn/trace-latency-map';
import { buildExampleSpanQuery } from './example_span_query';

const cell = {
  from: '2026-10-26T10:00:00.000Z',
  to: '2026-10-26T10:05:00.000Z',
  minDurationUs: 1000,
  maxDurationUs: 5000,
  spans: 12,
  failed: 2,
};

describe('buildExampleSpanQuery', () => {
  it('asks for the newest span of the cell, under the query filters', () => {
    const query = buildExampleSpanQuery({
      indexPattern: 'traces-apm*',
      filters: ['service.name == "cart"'],
      cell,
    });
    expect(query).toBe(
      [
        'SET unmapped_fields="NULLIFY";',
        'FROM traces-apm*',
        `| WHERE (${selectionToEsqlCondition(cell)}) AND (service.name == "cart")`,
        '| SORT @timestamp DESC',
        '| LIMIT 1',
      ].join('\n')
    );
  });

  it('brackets each filter, so an OR cannot escape the cell', () => {
    const query = buildExampleSpanQuery({
      indexPattern: 'traces-apm*',
      filters: ['a == 1 OR b == 2'],
      cell,
    });
    expect(query).toContain(') AND (a == 1 OR b == 2)');
  });
});
