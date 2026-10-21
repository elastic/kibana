/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@kbn/inspector-plugin/public';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import { esqlRequestLabels } from './esql_request_label';

function request(id: string, name: string, query?: string): Request {
  return {
    id,
    name,
    startTime: 0,
    status: RequestStatus.OK,
    ...(query ? { json: { query, include_execution_metadata: true } } : {}),
  };
}

describe('esqlRequestLabels', () => {
  it('keeps a name that only appears once', () => {
    const labels = esqlRequestLabels([
      request('documents', 'Documents', 'FROM logs'),
      request('chart', 'Chart', 'FROM logs | STATS count()'),
    ]);

    expect(labels.get('documents')).toBe('Documents');
    expect(labels.get('chart')).toBe('Chart');
  });

  it('uses the query when two requests share a name', () => {
    const labels = esqlRequestLabels([
      request('a', 'Visualization', 'FROM logs | STATS count()'),
      request('b', 'Visualization', 'FROM logs | STATS avg(bytes)'),
    ]);

    expect(labels.get('a')).toBe('FROM logs | STATS count()');
    expect(labels.get('b')).toBe('FROM logs | STATS avg(bytes)');
  });

  it('numbers requests that still look the same after the query is shortened', () => {
    const shared = `FROM logs | STATS ${'count(), '.repeat(40)}`;
    const labels = esqlRequestLabels([
      request('a', 'Visualization', shared),
      request('b', 'Visualization', `${shared} count()`),
    ]);

    expect(labels.get('a')).toBe('Visualization (1)');
    expect(labels.get('b')).toBe('Visualization (2)');
  });
});
