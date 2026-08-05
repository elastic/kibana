/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpanLinkDetails } from '@kbn/apm-types';
import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';

import {
  createServiceNameWhereClause,
  createSpanNameWhereClause,
  createTraceIdWhereClause,
} from '.';

const indexPattern = 'apm-traces-*';

const render = (condition: ESQLAstExpression): string =>
  esql.from(indexPattern).where`${condition}`.print('pipe-multiline');

describe('span links where clauses', () => {
  describe('createSpanNameWhereClause', () => {
    it('uses transaction id when available', () => {
      const item = {
        spanId: 'span123',
        traceId: 'trace456',
        details: { transactionId: 'transaction999' },
      } as unknown as SpanLinkDetails;

      expect(render(createSpanNameWhereClause(item))).toEqual(
        'FROM apm-traces-*\n  | WHERE transaction.id == "transaction999"'
      );
    });

    it('falls back to span id when transaction id is missing', () => {
      const item = {
        spanId: 'span123',
        traceId: 'trace456',
        details: undefined,
      } as unknown as SpanLinkDetails;

      expect(render(createSpanNameWhereClause(item))).toEqual(
        'FROM apm-traces-*\n  | WHERE span.id == "span123"'
      );
    });
  });

  describe('createServiceNameWhereClause', () => {
    it('returns undefined when serviceName is missing', () => {
      const item = {
        spanId: 'span123',
        traceId: 'trace456',
        details: undefined,
      } as unknown as SpanLinkDetails;

      expect(createServiceNameWhereClause(item)).toBeUndefined();
    });

    it('creates where clause for service name when available', () => {
      const item = {
        spanId: 'span123',
        traceId: 'trace456',
        details: { serviceName: 'myService' },
      } as unknown as SpanLinkDetails;

      expect(render(createServiceNameWhereClause(item)!)).toEqual(
        'FROM apm-traces-*\n  | WHERE service.name == "myService"'
      );
    });
  });

  describe('createTraceIdWhereClause', () => {
    it('creates where clause for trace id', () => {
      const item = {
        spanId: 'span123',
        traceId: 'trace456',
        details: undefined,
      } as unknown as SpanLinkDetails;

      expect(render(createTraceIdWhereClause(item))).toEqual(
        'FROM apm-traces-*\n  | WHERE trace.id == "trace456"'
      );
    });
  });
});
