/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatFailure } from './format_failure';
import type { BreakingChange } from '../diff/breaking_rules';

const pathRemovedBreaking = (path: string, reason = 'Endpoint removed'): BreakingChange => ({
  type: 'path_removed',
  path,
  reason,
});

const methodRemovedBreaking = (
  path: string,
  method: string,
  reason = 'HTTP method removed'
): BreakingChange => ({ type: 'method_removed', path, method, reason });

const operationBreaking = (
  path: string,
  method: string,
  reason: string,
  details?: unknown
): BreakingChange => ({ type: 'operation_breaking', path, method, reason, details });

describe('formatFailure', () => {
  it('formats a single breaking change', () => {
    const changes = [pathRemovedBreaking('/api/test')];

    const output = formatFailure(changes);

    expect(output).toContain('API CONTRACT BREAKING CHANGES DETECTED');
    expect(output).toContain('Found 1 breaking change(s)');
    expect(output).toContain('1. Endpoint removed');
    expect(output).toContain('Path: /api/test');
    expect(output).toContain('What to do next:');
  });

  it('formats multiple breaking changes', () => {
    const changes = [
      pathRemovedBreaking('/api/old'),
      methodRemovedBreaking('/api/test', 'delete'),
      operationBreaking('/api/test', 'post', 'requestBody modified', { content: {} }),
    ];

    const output = formatFailure(changes);

    expect(output).toContain('Found 3 breaking change(s)');
    expect(output).toContain('1. Endpoint removed');
    expect(output).toContain('2. HTTP method removed');
    expect(output).toContain('3. requestBody modified');
    expect(output).toContain('Method: DELETE');
    expect(output).toContain('Method: POST');
  });

  it('includes details when present', () => {
    const changes = [
      operationBreaking('/api/test', 'get', 'responses modified', {
        '200': { description: 'Success' },
      }),
    ];

    const output = formatFailure(changes);

    expect(output).toContain('Details:');
    expect(output).toContain('"200"');
    expect(output).toContain('"description": "Success"');
  });

  it('produces deterministic output for same input', () => {
    const changes = [pathRemovedBreaking('/api/test')];

    const output1 = formatFailure(changes);
    const output2 = formatFailure(changes);

    expect(output1).toEqual(output2);
  });

  it('includes help links', () => {
    const changes = [pathRemovedBreaking('/api/test')];

    const output = formatFailure(changes);

    expect(output).toContain('Documentation:');
    expect(output).toContain('Need help?');
  });
});
