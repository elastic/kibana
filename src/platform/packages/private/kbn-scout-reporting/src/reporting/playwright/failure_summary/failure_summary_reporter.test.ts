/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import stripANSI from 'strip-ansi';
import { ScoutFailureSummaryReporter } from './failure_summary_reporter';

const createMockTest = (
  overrides: {
    titlePath?: string[];
    title?: string;
    file?: string;
    line?: number;
  } = {}
): TestCase => {
  const {
    titlePath = ['', 'local', 'path/to/file.spec.ts', 'My Suite', 'should work'],
    title = titlePath[titlePath.length - 1],
    file = '/repo-root/path/to/file.spec.ts',
    line = 42,
  } = overrides;

  return {
    titlePath: () => titlePath,
    title,
    location: { file, line, column: 0 },
  } as unknown as TestCase;
};

const createMockResult = (
  overrides: {
    status?: TestResult['status'];
    errorMessage?: string;
    errors?: Array<{ message?: string }>;
    attachments?: TestResult['attachments'];
  } = {}
): TestResult => {
  const { status = 'failed', errorMessage, errors, attachments = [] } = overrides;

  const primaryError = errorMessage ? { message: errorMessage } : undefined;

  return {
    status,
    error: primaryError,
    errors: errors ?? (primaryError ? [primaryError] : []),
    attachments,
  } as unknown as TestResult;
};

const collectOutput = (reporter: ScoutFailureSummaryReporter): { raw: string[]; text: string } => {
  const raw: string[] = [];
  const originalStdoutWrite = process.stdout.write;
  process.stdout.write = ((chunk: string) => {
    raw.push(chunk);
    return true;
  }) as typeof process.stdout.write;

  reporter.onEnd({ status: 'failed' } as FullResult);

  process.stdout.write = originalStdoutWrite;
  return { raw, text: stripANSI(raw.join('')) };
};

describe('ScoutFailureSummaryReporter', () => {
  let reporter: ScoutFailureSummaryReporter;

  beforeEach(() => {
    reporter = new ScoutFailureSummaryReporter();
  });

  it('should not print anything when there are no failures', () => {
    const { raw } = collectOutput(reporter);
    expect(raw).toEqual([]);
  });

  it('should not collect passing or skipped tests', () => {
    reporter.onTestEnd(createMockTest(), createMockResult({ status: 'passed' }));
    reporter.onTestEnd(createMockTest(), createMockResult({ status: 'skipped' }));
    const { raw } = collectOutput(reporter);
    expect(raw).toEqual([]);
  });

  it('should print a failure with suite, file path, and raw error message', () => {
    const errorMsg =
      'Error: expect(locator).toHaveCount(expected) failed\n\nExpected: 0\nReceived: 1';
    reporter.onTestEnd(createMockTest(), createMockResult({ errorMessage: errorMsg }));

    const { text } = collectOutput(reporter);

    expect(text).toContain('Scout failure summary:');
    expect(text).toContain('My Suite');
    expect(text).toContain('\u2717 should work');
    expect(text).toContain('path/to/file.spec.ts:42');
    expect(text).toContain('expect(locator).toHaveCount(expected) failed');
    expect(text).toContain('Expected: 0');
    expect(text).toContain('Received: 1');
    expect(text).toContain('1 test(s) failed.');
  });

  it('should group multiple failures under the same suite', () => {
    reporter.onTestEnd(
      createMockTest({
        titlePath: ['', 'local', 'file.spec.ts', 'Suite A', 'test one'],
        file: '/repo-root/file.spec.ts',
        line: 10,
      }),
      createMockResult({ errorMessage: 'Error one' })
    );
    reporter.onTestEnd(
      createMockTest({
        titlePath: ['', 'local', 'file.spec.ts', 'Suite A', 'test two'],
        file: '/repo-root/file.spec.ts',
        line: 20,
      }),
      createMockResult({ errorMessage: 'Error two' })
    );

    const { text } = collectOutput(reporter);

    const suiteMatches = text.match(/Suite A/g);
    expect(suiteMatches).toHaveLength(1);
    expect(text).toContain('\u2717 test one');
    expect(text).toContain('\u2717 test two');
    expect(text).toContain('2 test(s) failed.');
  });

  it('should render nested suites as "Outer > Inner"', () => {
    reporter.onTestEnd(
      createMockTest({
        titlePath: ['', 'local', 'file.spec.ts', 'Outer', 'Inner', 'deep test'],
        file: '/repo-root/file.spec.ts',
        line: 5,
      }),
      createMockResult({ errorMessage: 'Deep failure' })
    );

    const { text } = collectOutput(reporter);

    expect(text).toContain('Outer > Inner');
    expect(text).toContain('\u2717 deep test');
  });

  it('should append status tags for timedOut and interrupted tests', () => {
    reporter.onTestEnd(
      createMockTest({
        titlePath: ['', 'local', 'f.spec.ts', 'S', 'timeout test'],
        file: '/repo-root/f.spec.ts',
        line: 1,
      }),
      createMockResult({ status: 'timedOut', errorMessage: 'Timed out 60000ms' })
    );
    reporter.onTestEnd(
      createMockTest({
        titlePath: ['', 'local', 'f.spec.ts', 'S', 'interrupted test'],
        file: '/repo-root/f.spec.ts',
        line: 2,
      }),
      createMockResult({ status: 'interrupted', errorMessage: 'Worker stopped' })
    );

    const { text } = collectOutput(reporter);

    expect(text).toContain('\u2717 timeout test  [timeout]');
    expect(text).toContain('\u2717 interrupted test  [interrupted]');
  });

  it('should not append a status tag for regular failures', () => {
    reporter.onTestEnd(createMockTest(), createMockResult({ errorMessage: 'Assertion error' }));

    const { text } = collectOutput(reporter);

    expect(text).not.toContain('[timeout]');
    expect(text).not.toContain('[interrupted]');
  });

  it('should pass through raw error message preserving its original format', () => {
    const rawError = [
      'Error: expect(locator).toHaveCount(expected) failed',
      '',
      'Locator:  locator(\'tr [data-test-subj^="workflowToggleSwitch-"]\')',
      'Expected: 0',
      'Received: 1',
      'Timeout:  10000ms',
    ].join('\n');

    reporter.onTestEnd(createMockTest(), createMockResult({ errorMessage: rawError }));

    const { text } = collectOutput(reporter);

    expect(text).toContain('expect(locator).toHaveCount(expected) failed');
    expect(text).toContain('Locator:');
    expect(text).toContain('Expected: 0');
    expect(text).toContain('Received: 1');
    expect(text).toContain('Timeout:  10000ms');
  });

  it('should fall back to status label when no error message is available', () => {
    reporter.onTestEnd(createMockTest(), createMockResult({ status: 'timedOut' }));
    reporter.onTestEnd(
      createMockTest({
        titlePath: ['', 'local', 'f.spec.ts', 'S', 'other'],
        file: '/repo-root/f.spec.ts',
        line: 2,
      }),
      createMockResult({ status: 'failed' })
    );

    const { text } = collectOutput(reporter);

    expect(text).toContain('Test timed out');
    expect(text).toContain('Test failed');
  });

  it('should extract error from result.errors array when result.error is undefined', () => {
    reporter.onTestEnd(
      createMockTest(),
      createMockResult({ errors: [{ message: 'Error from errors array' }] })
    );

    const { text } = collectOutput(reporter);

    expect(text).toContain('Error from errors array');
  });

  it('should handle tests with empty titlePath().slice(3) gracefully', () => {
    reporter.onTestEnd(
      createMockTest({
        titlePath: ['', 'local', 'setup.ts'],
        title: 'global setup',
        file: '/repo-root/setup.ts',
        line: 1,
      }),
      createMockResult({ errorMessage: 'Setup failed' })
    );

    const { text } = collectOutput(reporter);

    expect(text).toContain('\u2717 global setup');
    expect(text).toContain('setup.ts:1');
  });

  it('should display screenshot paths and error context file', () => {
    reporter.onTestEnd(
      createMockTest(),
      createMockResult({
        errorMessage: 'Assertion failed',
        attachments: [
          {
            name: 'screenshot',
            path: '/tmp/test-artifacts/test-failed-1.png',
            contentType: 'image/png',
          },
          {
            name: 'Error Context',
            path: '/tmp/test-artifacts/error-context.md',
            contentType: 'text/markdown',
          },
        ],
      })
    );

    const { text } = collectOutput(reporter);

    expect(text).toContain('screenshot: /tmp/test-artifacts/test-failed-1.png');
    expect(text).toContain('error context: /tmp/test-artifacts/error-context.md');
  });

  it('should skip non-image attachments and attachments without paths', () => {
    reporter.onTestEnd(
      createMockTest(),
      createMockResult({
        errorMessage: 'Failure',
        attachments: [
          { name: 'trace', path: '/tmp/trace.zip', contentType: 'application/zip' },
          { name: 'screenshot', contentType: 'image/png' },
          { name: 'actual', path: '/tmp/actual.png', contentType: 'image/png' },
        ],
      })
    );

    const { text } = collectOutput(reporter);

    expect(text).not.toContain('trace.zip');
    expect(text).toContain('screenshot: /tmp/actual.png');
    expect(text).not.toContain('error context:');
  });
});
