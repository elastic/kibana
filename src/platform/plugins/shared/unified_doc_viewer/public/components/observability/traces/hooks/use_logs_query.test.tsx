/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useLogsQuery } from './use_logs_query';

function TestComponent({
  traceId,
  spanId,
  transactionId,
}: {
  traceId: string;
  transactionId?: string;
  spanId?: string;
}) {
  const query = useLogsQuery({ traceId, spanId, transactionId });
  return <div data-test-subj="query">{query.query}</div>;
}

describe('useLogsQuery', () => {
  it('builds query for traceId ', () => {
    render(<TestComponent traceId="trace123" />);
    const div = screen.getByTestId('query');
    expect(div.textContent).toBe(`(trace.id:"trace123" OR (not trace.id:* AND "trace123"))`);
  });

  it('builds query for traceId, transactionId and spanId', () => {
    render(<TestComponent traceId="trace123" spanId="span456" transactionId="transaction123" />);
    const div = screen.getByTestId('query');
    expect(div.textContent).toBe(
      `(trace.id:"trace123" OR (not trace.id:* AND "trace123")) AND ` +
        `(transaction.id:"transaction123" OR (not transaction.id:* AND "transaction123")) AND ` +
        `(span.id:"span456" OR (not span.id:* AND "span456"))`
    );
  });
});
