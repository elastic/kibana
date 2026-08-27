/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { ScoutFailureReport } from './report';
import type { TestFailure } from './test_failure';

const createMockLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  } as unknown as ToolingLog);

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

describe('ScoutFailureReport', () => {
  let destination: string;

  beforeEach(() => {
    destination = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'scout-report-')), 'out');
  });

  afterEach(() => {
    fs.rmSync(path.dirname(destination), { recursive: true, force: true });
  });

  const readSummary = (): Array<{ name: string; htmlReportFilename: string }> =>
    JSON.parse(fs.readFileSync(path.join(destination, 'test-failures-summary.json'), 'utf-8'));

  it('writes one HTML report and one summary row per unique test id', () => {
    const report = new ScoutFailureReport(createMockLog());
    report.logEvent(createMockFailure({ id: 'a' }));
    report.logEvent(createMockFailure({ id: 'b' }));

    report.save(destination);

    expect(fs.existsSync(path.join(destination, 'a.html'))).toBe(true);
    expect(fs.existsSync(path.join(destination, 'b.html'))).toBe(true);
    expect(readSummary()).toHaveLength(2);
  });

  it('keeps only the last attempt when a test fails on more than one attempt', () => {
    const report = new ScoutFailureReport(createMockLog());
    report.logEvent(createMockFailure({ id: 'retried', attempt: 0, duration: 100 }));
    report.logEvent(createMockFailure({ id: 'retried', attempt: 1, duration: 200 }));

    report.save(destination);

    // One summary row, not two, and the surviving HTML reflects the retried attempt.
    expect(readSummary()).toHaveLength(1);
    const html = fs.readFileSync(path.join(destination, 'retried.html'), 'utf-8');
    expect(html).toContain('Failed again on retry (attempt 2)');
  });
});
