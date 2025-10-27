/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTraceContextWhereClause } from './create_trace_context_where_clause';
import { from } from '@kbn/esql-composer';

const source = from('foo-*');

describe('createTraceContextWhereClause', () => {
  it('returns a where AST node with only traceId', () => {
    const pipeline = source.pipe(createTraceContextWhereClause({ traceId: 'abc123' }));
    expect(pipeline.toString()).toEqual('FROM foo-*\n  | WHERE trace.id == "abc123"');
  });

  it('returns a pipeline with traceId and spanId', () => {
    const pipeline = source.pipe(
      createTraceContextWhereClause({ traceId: 'abc123', spanId: 'span456' })
    );
    expect(pipeline.toString()).toEqual(
      'FROM foo-*\n  | WHERE trace.id == "abc123" AND span.id == "span456"'
    );
  });
  it('returns a pipeline with traceId and transactionId', () => {
    const pipeline = source.pipe(
      createTraceContextWhereClause({ traceId: 'abc123', transactionId: 'txn789' })
    );
    expect(pipeline.toString()).toEqual(
      'FROM foo-*\n  | WHERE trace.id == "abc123" AND transaction.id == "txn789"'
    );
  });

  it('returns a pipeline with all fields', () => {
    const pipeline = source.pipe(
      createTraceContextWhereClause({
        traceId: 'abc123',
        spanId: 'span456',
        transactionId: 'txn789',
      })
    );
    expect(pipeline.toString()).toEqual(
      'FROM foo-*\n  | WHERE trace.id == "abc123" AND (transaction.id == "txn789" OR span.id == "span456")'
    );
  });
});
