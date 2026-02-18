/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '../../../..';
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
  it('returns labeled column', () => {
    assertSummary('PROMQL index=metrics col0=(sum(bytes))', {
      expectedNewColumns: ['col0'],
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
  it.todo('returns query text as column name when no label is provided');
  it.todo('collects columns derivated from grouping inside the query');
});
