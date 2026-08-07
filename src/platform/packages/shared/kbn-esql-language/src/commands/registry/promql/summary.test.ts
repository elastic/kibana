/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { summary } from './summary';

const assertSummary = (query: string, { expectedNewColumns }: { expectedNewColumns: string[] }) => {
  const {
    root: {
      commands: [command],
    },
  } = Parser.parseQuery(query);
  const result = summary(command, query);
  expect(Array.from(result.newColumns)).toEqual(expectedNewColumns);
};

describe('PROMQL summary', () => {
  it('returns the step and labeled columns for a range query without explicit step params', () => {
    assertSummary('PROMQL index=metrics col0=(sum(bytes))', {
      expectedNewColumns: ['step', 'col0'],
    });
  });
  it('returns the step column when step param is present', () => {
    assertSummary('PROMQL index=metrics step="5m" col0=(sum(bytes))', {
      expectedNewColumns: ['step', 'col0'],
    });
  });
  it('returns the step column when buckets param is used', () => {
    assertSummary('PROMQL index=metrics buckets=6 col0=(sum(bytes))', {
      expectedNewColumns: ['step', 'col0'],
    });
  });
  it('returns the step column even when time param is used', () => {
    assertSummary('PROMQL index=metrics time="2026-01-13T11:30:00.000Z" col0=(sum(bytes))', {
      expectedNewColumns: ['step', 'col0'],
    });
  });
  it('returns the query expression text as column name when no label is provided', () => {
    const expression = 'rate(http_requests_total[5m])';
    assertSummary(`PROMQL index=metrics ${expression}`, {
      expectedNewColumns: ['step', expression],
    });
  });
  it('collects columns derivated from grouping inside the query', () => {
    const expression = 'sum by (job, instance) (rate(http_requests_total[5m]))';
    assertSummary(`PROMQL index=metrics ${expression}`, {
      expectedNewColumns: ['step', expression, 'job', 'instance'],
    });
  });
  it('collects grouping columns together with a user-defined label', () => {
    assertSummary('PROMQL index=metrics col0=(sum by (job) (rate(http_requests_total[5m])))', {
      expectedNewColumns: ['step', 'col0', 'job'],
    });
  });
});
