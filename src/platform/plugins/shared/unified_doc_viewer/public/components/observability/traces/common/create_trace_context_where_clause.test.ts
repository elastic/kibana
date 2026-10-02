/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import {
  createTraceContextWhereClause,
  createTraceContextWhereClauseForErrors,
} from './create_trace_context_where_clause';

const render = (condition: ESQLAstExpression): string => {
  const query = esql.from('foo-*');
  query.where`${condition}`;
  return query.print('pipe-multiline');
};

describe('createTraceContextWhereClause', () => {
  it('returns a where AST node with only traceId', () => {
    const result = render(createTraceContextWhereClause({ traceId: 'abc123' }));
    expect(result).toEqual('FROM foo-*\n  | WHERE trace.id == "abc123"');
  });

  it('returns a pipeline with traceId and spanId', () => {
    const result = render(createTraceContextWhereClause({ traceId: 'abc123', spanId: 'span456' }));
    expect(result).toEqual('FROM foo-*\n  | WHERE trace.id == "abc123" AND span.id == "span456"');
  });
  it('returns a pipeline with traceId and transactionId', () => {
    const result = render(
      createTraceContextWhereClause({ traceId: 'abc123', transactionId: 'txn789' })
    );
    expect(result).toEqual(
      'FROM foo-*\n  | WHERE trace.id == "abc123" AND transaction.id == "txn789"'
    );
  });

  it('returns a pipeline with all fields', () => {
    const result = render(
      createTraceContextWhereClause({
        traceId: 'abc123',
        spanId: 'span456',
        transactionId: 'txn789',
      })
    );
    expect(result).toEqual(
      'FROM foo-*\n  | WHERE trace.id == "abc123" AND (transaction.id == "txn789" OR span.id == "span456")'
    );
  });

  it('preserves backslash-then-letter sequences in ids without double-escaping', () => {
    const result = render(
      createTraceContextWhereClause({ traceId: String.raw`a\nb`, spanId: String.raw`c\td` })
    );
    expect(result).toEqual(String.raw`FROM foo-*
  | WHERE trace.id == "a\\nb" AND span.id == "c\\td"`);
  });
});

describe('createTraceContextWhereClauseForErrors', () => {
  // The last alternative mirrors the server-side getUnprocessedOtelErrors query: an unprocessed
  // OTel exception is discriminated by any one of event_name, exception.type or exception.message,
  // and must not carry processor.event.
  const errorFilters = String.raw`KQL("processor.event: \"error\" OR error.log.level: \"error\" OR event_name: \"error\" OR ((event_name: \"exception\" or exception.type: * or exception.message: *) and not processor.event: *)")`;

  it('returns a where AST node with traceId and error filters', () => {
    const result = render(createTraceContextWhereClauseForErrors({ traceId: 'abc123' }));
    expect(result).toEqual(`FROM foo-*
  | WHERE trace.id == "abc123" AND ${errorFilters}`);
  });

  it('returns a pipeline with traceId, spanId and error filters', () => {
    const result = render(
      createTraceContextWhereClauseForErrors({ traceId: 'abc123', spanId: 'span456' })
    );
    expect(result).toEqual(`FROM foo-*
  | WHERE trace.id == "abc123" AND span.id == "span456" AND ${errorFilters}`);
  });

  it('returns a pipeline with traceId, transactionId and error filters', () => {
    const result = render(
      createTraceContextWhereClauseForErrors({ traceId: 'abc123', transactionId: 'txn789' })
    );
    expect(result).toEqual(`FROM foo-*
  | WHERE trace.id == "abc123" AND transaction.id == "txn789" AND ${errorFilters}`);
  });

  it('returns a pipeline with all fields and error filters', () => {
    const result = render(
      createTraceContextWhereClauseForErrors({
        traceId: 'abc123',
        spanId: 'span456',
        transactionId: 'txn789',
      })
    );
    expect(result).toEqual(`FROM foo-*
  | WHERE trace.id == "abc123" AND (transaction.id == "txn789" OR span.id == "span456") AND ${errorFilters}`);
  });

  it('matches unprocessed OTel exceptions that carry only exception.type or only exception.message', () => {
    // Regression guard for rows the unified-errors endpoint returns but the Discover link used to
    // miss, because the predicate only recognised event_name.
    const result = render(createTraceContextWhereClauseForErrors({ traceId: 'abc123' }));
    expect(result).toContain(String.raw`exception.type: *`);
    expect(result).toContain(String.raw`exception.message: *`);
    expect(result).toContain(String.raw`not processor.event: *`);
  });
});
