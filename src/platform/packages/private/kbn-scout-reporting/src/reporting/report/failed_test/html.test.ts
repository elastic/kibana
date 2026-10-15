/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildFailureHtml } from './html';
import type { TestFailure } from './test_failure';

const createMockFailure = (overrides: Partial<TestFailure> = {}): TestFailure => ({
  id: 'test-id-1',
  suite: 'My Suite',
  title: 'should work',
  target: 'local',
  command: 'node scripts/playwright test',
  location: 'path/to/file.spec.ts:1:1',
  owner: ['@elastic/kibana-scout'],
  duration: 1000,
  error: { message: 'boom', stack_trace: 'stack' },
  attachments: [],
  ...overrides,
});

describe('buildFailureHtml', () => {
  it('omits the retries row when attempt is undefined (not a retry-aware run)', () => {
    const html = buildFailureHtml(createMockFailure());
    expect(html).not.toContain('Retries:');
  });

  it('omits the retries row for a first attempt (attempt 0)', () => {
    const html = buildFailureHtml(createMockFailure({ attempt: 0 }));
    expect(html).not.toContain('Retries:');
  });

  it('shows that the test failed again on retry when attempt is greater than 0', () => {
    const html = buildFailureHtml(createMockFailure({ attempt: 1 }));
    expect(html).toContain('Retries:');
    expect(html).toContain('Failed again on retry (attempt 2)');
  });
});
