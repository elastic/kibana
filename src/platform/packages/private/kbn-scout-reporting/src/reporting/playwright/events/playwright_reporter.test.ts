/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { BROWSER_CONSOLE_ERRORS_ATTACHMENT } from '@kbn/scout-info';
import { ScoutReportEventAction } from '../../report';
import { ScoutPlaywrightReporter } from './playwright_reporter';

jest.mock('@kbn/code-owners', () => ({
  getCodeOwnersEntries: jest.fn(() => []),
  getOwningTeamsForPath: jest.fn(() => []),
  findAreaForCodeOwner: jest.fn(() => undefined),
}));

const createMockConfig = (): FullConfig =>
  ({ configFile: undefined, fullyParallel: false } as unknown as FullConfig);

const createMockSuite = (tests: TestCase[] = []): Suite =>
  ({ allTests: () => tests } as unknown as Suite);

const createMockTest = (): TestCase =>
  ({
    titlePath: () => ['', 'local', 'path/to/file.spec.ts', 'My Suite', 'should work'],
    title: 'should work',
    tags: [],
    annotations: [],
    expectedStatus: 'passed',
    location: { file: '/repo-root/path/to/file.spec.ts', line: 42, column: 0 },
    parent: {
      title: 'My Suite',
      type: 'describe',
      titlePath: () => ['', 'local', 'path/to/file.spec.ts', 'My Suite'],
    },
  } as unknown as TestCase);

/** A `TestCase` with a fixed `outcome()` and one `TestResult` per given status. */
const createMockTestCase = (overrides: {
  outcome: ReturnType<TestCase['outcome']>;
  statuses: Array<TestResult['status']>;
  title?: string;
  filePath?: string;
}): TestCase => {
  const { outcome, statuses, title = 'should work', filePath = 'path/to/file.spec.ts' } = overrides;

  return {
    titlePath: () => ['', 'local', filePath, 'My Suite', title],
    title,
    tags: [],
    annotations: [],
    expectedStatus: 'passed',
    location: { file: `/repo-root/${filePath}`, line: 42, column: 0 },
    parent: {
      title: 'My Suite',
      type: 'describe',
      titlePath: () => ['', 'local', filePath, 'My Suite'],
    },
    outcome: () => outcome,
    results: statuses.map((status) => ({ status, duration: 100 })),
  } as unknown as TestCase;
};

const createMockFullResult = (status: FullResult['status'] = 'passed'): FullResult =>
  ({ status, duration: 1000 } as FullResult);

const createMockResult = (
  overrides: { attachments?: TestResult['attachments']; retry?: number } = {}
): TestResult =>
  ({
    status: 'failed',
    startTime: new Date(),
    duration: 1000,
    retry: overrides.retry ?? 0,
    attachments: overrides.attachments ?? [],
    error: undefined,
    stdout: [],
    stderr: [],
  } as unknown as TestResult);

describe('ScoutPlaywrightReporter', () => {
  let reporter: ScoutPlaywrightReporter;
  let logEventSpy: jest.SpyInstance;

  beforeEach(() => {
    reporter = new ScoutPlaywrightReporter({ runId: 'test-run-id' });
    logEventSpy = jest.spyOn((reporter as any).report, 'logEvent').mockImplementation(() => {});
    // `onEnd` also calls save()/conclude(), which otherwise touch the filesystem for real.
    jest.spyOn((reporter as any).report, 'save').mockImplementation(() => {});
    jest.spyOn((reporter as any).report, 'conclude').mockImplementation(() => {});
    reporter.onBegin(createMockConfig(), createMockSuite());
  });

  const getLoggedEvents = () => logEventSpy.mock.calls.map(([event]) => event);

  const getTestEndEvent = () =>
    getLoggedEvents().find((event) => event.event?.action === ScoutReportEventAction.TEST_END);

  const getTestOutcomeEvents = () =>
    getLoggedEvents().filter(
      (event) => event.event?.action === ScoutReportEventAction.TEST_OUTCOME
    );

  const getRunEndEvent = () =>
    getLoggedEvents().find((event) => event.event?.action === ScoutReportEventAction.RUN_END);

  describe('getScoutConfigInfo', () => {
    const getInfo = (configPath: string) => (reporter as any).getScoutConfigInfo(configPath);

    it('returns ui-test category for root-level ui config', () => {
      expect(getInfo('src/platform/plugins/shared/foo/test/scout/ui/playwright.config.ts')).toEqual(
        { category: 'ui-test', namespace: undefined }
      );
    });

    it('returns api-test category for root-level api config', () => {
      expect(
        getInfo('src/platform/plugins/shared/foo/test/scout/api/playwright.config.ts')
      ).toEqual({ category: 'api-test', namespace: undefined });
    });

    it('returns ui-test category for scout_* root ui config', () => {
      expect(
        getInfo('src/platform/plugins/shared/foo/test/scout_custom/ui/playwright.config.ts')
      ).toEqual({ category: 'ui-test', namespace: undefined });
    });

    it('returns ui-test category and namespace for namespace-based ui config', () => {
      expect(
        getInfo(
          'x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/ui/parallel.playwright.config.ts'
        )
      ).toEqual({ category: 'ui-test', namespace: 'entity_analytics' });
    });

    it('returns api-test category and namespace for namespace-based api config', () => {
      expect(
        getInfo(
          'x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/api/playwright.config.ts'
        )
      ).toEqual({ category: 'api-test', namespace: 'entity_analytics' });
    });

    it('returns UNKNOWN category and no namespace for unrecognised path', () => {
      expect(getInfo('some/other/path/config.ts')).toEqual({
        category: 'unknown',
        namespace: undefined,
      });
    });
  });

  describe('onTestEnd', () => {
    it('sets console_errors on the test-end event when the attachment is present', () => {
      const consoleErrorText = 'Error: React state update on unmounted component';

      reporter.onTestEnd(
        createMockTest(),
        createMockResult({
          attachments: [
            {
              name: BROWSER_CONSOLE_ERRORS_ATTACHMENT,
              body: Buffer.from(consoleErrorText),
              contentType: 'text/plain',
            },
          ],
        })
      );

      expect(getTestEndEvent()?.test?.console_errors).toBe(consoleErrorText);
    });

    it('omits console_errors from the test-end event when no attachment is present', () => {
      reporter.onTestEnd(createMockTest(), createMockResult());

      expect(getTestEndEvent()?.test?.console_errors).toBeUndefined();
    });

    it('sets attempt to result.retry', () => {
      reporter.onTestEnd(createMockTest(), createMockResult({ retry: 1 }));

      expect(getTestEndEvent()?.test?.attempt).toBe(1);
    });

    it('does not emit a test-begin event (dropped to keep event volume neutral)', () => {
      reporter.onTestEnd(createMockTest(), createMockResult());

      expect(
        getLoggedEvents().some((event) => event.event?.action === ScoutReportEventAction.TEST_BEGIN)
      ).toBe(false);
    });
  });

  describe('onEnd', () => {
    const expectedTest = createMockTestCase({
      outcome: 'expected',
      statuses: ['passed'],
      title: 'passes first time',
    });
    const flakyTest = createMockTestCase({
      outcome: 'flaky',
      statuses: ['failed', 'passed'],
      title: 'flaky test',
    });
    const unexpectedTest = createMockTestCase({
      outcome: 'unexpected',
      statuses: ['failed', 'failed'],
      title: 'hard fail',
    });
    const skippedTest = createMockTestCase({
      outcome: 'skipped',
      statuses: ['skipped'],
      title: 'statically skipped',
    });

    it('emits one test-outcome event per test, with the outcome and attempt count', async () => {
      reporter.onBegin(
        createMockConfig(),
        createMockSuite([expectedTest, flakyTest, unexpectedTest, skippedTest])
      );

      await reporter.onEnd(createMockFullResult('failed'));

      const outcomeByTitle = Object.fromEntries(
        getTestOutcomeEvents().map((event) => [event.test?.title, event.test])
      );

      expect(outcomeByTitle['passes first time']).toMatchObject({
        outcome: 'expected',
        attempts: 1,
      });
      expect(outcomeByTitle['flaky test']).toMatchObject({ outcome: 'flaky', attempts: 2 });
      expect(outcomeByTitle['hard fail']).toMatchObject({ outcome: 'unexpected', attempts: 2 });
      expect(outcomeByTitle['statically skipped']).toMatchObject({
        outcome: 'skipped',
        attempts: 1,
      });
      expect(getTestOutcomeEvents()).toHaveLength(4);
    });

    it('derives run-end stats from final outcomes, counting a flaky test as a pass', async () => {
      reporter.onBegin(
        createMockConfig(),
        createMockSuite([expectedTest, flakyTest, unexpectedTest, skippedTest])
      );

      await reporter.onEnd(createMockFullResult('failed'));

      expect(getRunEndEvent()?.test_run?.tests).toEqual({
        passes: 2,
        failures: 1,
        pending: 1,
        flaky: 1,
        total: 4,
      });
    });

    it('produces empty stats when the suite was never captured (no onBegin)', async () => {
      // Reporter constructed but onBegin never called — should not throw.
      const freshReporter = new ScoutPlaywrightReporter({ runId: 'no-begin' });
      const freshLogEventSpy: jest.SpyInstance = jest
        .spyOn((freshReporter as any).report, 'logEvent')
        .mockImplementation(() => {});
      jest.spyOn((freshReporter as any).report, 'save').mockImplementation(() => {});
      jest.spyOn((freshReporter as any).report, 'conclude').mockImplementation(() => {});

      await freshReporter.onEnd(createMockFullResult('passed'));

      const runEndEvent = freshLogEventSpy.mock.calls
        .map(([event]) => event)
        .find((event) => event.event?.action === ScoutReportEventAction.RUN_END);
      expect(runEndEvent?.test_run?.tests).toEqual({
        passes: 0,
        failures: 0,
        pending: 0,
        flaky: 0,
        total: 0,
      });
    });
  });
});
