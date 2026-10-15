/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

import { processJUnitReports } from './process_junit_reports';
import type { ProcessReportsParams } from './process_reports_types';
import type { TestFailure } from './get_failures';
import type { ExistingFailedTestIssue } from './existing_failed_test_issues';

jest.mock('./test_report', () => ({ readTestReport: jest.fn(), getRootMetadata: jest.fn() }));
jest.mock('./get_failures', () => ({ getFailures: jest.fn() }));
jest.mock('./report_metadata', () => ({ getReportMessageIter: jest.fn() }));
jest.mock('./report_failure', () => ({
  createFailureIssue: jest.fn(),
  updateFailureIssue: jest.fn(),
}));
jest.mock('./report_failures_to_es', () => ({ reportFailuresToEs: jest.fn() }));
jest.mock('./report_failures_to_file', () => ({ reportFailuresToFile: jest.fn() }));
jest.mock('./add_messages_to_report', () => ({ addMessagesToReport: jest.fn() }));

const { readTestReport, getRootMetadata } = jest.requireMock('./test_report');
const { getFailures } = jest.requireMock('./get_failures');
const { getReportMessageIter } = jest.requireMock('./report_metadata');
const { createFailureIssue, updateFailureIssue } = jest.requireMock('./report_failure');
const { reportFailuresToEs } = jest.requireMock('./report_failures_to_es');
const { reportFailuresToFile } = jest.requireMock('./report_failures_to_file');

const makeFailure = (i: number, overrides: Partial<TestFailure> = {}): TestFailure => ({
  classname: `suite ${i}`,
  name: `test ${i}`,
  failure: `failure ${i}`,
  time: '1.0',
  likelyIrrelevant: false,
  ...overrides,
});

const makeFtrFailure = (i: number, overrides: Partial<TestFailure> = {}): TestFailure =>
  makeFailure(i, { testType: 'ftr', ...overrides });

const createExistingIssue = (failure: TestFailure): ExistingFailedTestIssue => ({
  classname: failure.classname,
  name: failure.name,
  github: {
    nodeId: `node-${failure.classname}-${failure.name}`,
    number: 1,
    htmlUrl: 'https://github.com/issues/1',
    body: 'body',
  },
});

const createParams = (initialExistingIssues: ExistingFailedTestIssue[] = []) => {
  const trackedIssues = [...initialExistingIssues];
  const existingIssues = {
    loadForFailures: jest.fn(),
    getForFailure: jest.fn((failure: TestFailure) =>
      trackedIssues.find(
        (issue) => issue.classname === failure.classname && issue.name === failure.name
      )
    ),
    addNewlyCreated: jest.fn((failure: TestFailure) => {
      trackedIssues.push(createExistingIssue(failure));
    }),
  };

  const params = {
    log: new ToolingLog(),
    existingIssues,
    buildUrl: 'https://build-url',
    githubApi: {},
    branch: 'main',
    pipeline: 'kibana-on-merge',
    prependTitle: '',
    updateGithub: true,
    indexInEs: true,
    reportUpdate: true,
    bkMeta: {},
  } as unknown as ProcessReportsParams;

  return { params, existingIssues };
};

beforeEach(() => {
  jest.clearAllMocks();
  readTestReport.mockResolvedValue({});
  getRootMetadata.mockReturnValue({});
  getReportMessageIter.mockReturnValue([]);
  createFailureIssue.mockResolvedValue({ html_url: 'https://github.com/issues/1' });
  updateFailureIssue.mockResolvedValue({ newBody: 'body', newCount: 2 });
});

describe('processJUnitReports FTR one-new-issue cap', () => {
  it('reports the single FTR failure to GitHub as a new issue', async () => {
    getFailures.mockReturnValue([makeFtrFailure(0)]);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(updateFailureIssue).not.toHaveBeenCalled();
  });

  it('reports only the first new FTR failure and skips the rest in the same report', async () => {
    const failures = [makeFtrFailure(0), makeFtrFailure(1)];
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue.mock.calls[0][1]).toBe(failures[0]);
    // ES indexing and file reporting still run over every failure — that's real signal we keep.
    expect(reportFailuresToEs).toHaveBeenCalledTimes(1);
    expect(reportFailuresToEs.mock.calls[0][1]).toHaveLength(2);
    expect(reportFailuresToFile).toHaveBeenCalledTimes(1);
    expect(reportFailuresToFile.mock.calls[0][1]).toHaveLength(2);
  });

  it('updates a tracked FTR failure and still creates an issue for the first new failure', async () => {
    const failures = [makeFtrFailure(0), makeFtrFailure(1)];
    getFailures.mockReturnValue(failures);

    const { params } = createParams([createExistingIssue(failures[0])]);

    await processJUnitReports(['report.xml'], params);

    expect(updateFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue).toHaveBeenCalledTimes(1);
  });

  it('updates a tracked FTR failure even when a new issue was already created in the same report', async () => {
    const failures = [makeFtrFailure(0), makeFtrFailure(1)];
    getFailures.mockReturnValue(failures);

    const { params } = createParams([createExistingIssue(failures[1])]);

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(updateFailureIssue).toHaveBeenCalledTimes(1);
  });

  it('does not count duplicate FTR classname+name entries toward the new-issue cap', async () => {
    const failures = [
      makeFtrFailure(0),
      makeFtrFailure(0, { failure: 'another failure entry for the same test' }),
    ];
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(updateFailureIssue).not.toHaveBeenCalled();
  });

  it('does not consume the FTR report slot on likely-irrelevant failures', async () => {
    const failures = [makeFtrFailure(0, { likelyIrrelevant: true }), makeFtrFailure(1)];
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue.mock.calls[0][1]).toBe(failures[1]);
  });

  it('resets the FTR one-failure budget for each report path', async () => {
    getFailures.mockReturnValueOnce([makeFtrFailure(0)]).mockReturnValueOnce([makeFtrFailure(1)]);
    const { params } = createParams();

    await processJUnitReports(['report-1.xml', 'report-2.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(2);
  });
});

describe('processJUnitReports Jest and Cypress', () => {
  it.each(['jest', 'cypress'] as const)(
    'opens a GitHub issue for every distinct new %s failure in the same report',
    async (testType) => {
      const failures = [makeFailure(0, { testType }), makeFailure(1, { testType })];
      getFailures.mockReturnValue(failures);
      const { params } = createParams();

      await processJUnitReports(['report.xml'], params);

      expect(createFailureIssue).toHaveBeenCalledTimes(2);
      expect(createFailureIssue.mock.calls[0][1]).toBe(failures[0]);
      expect(createFailureIssue.mock.calls[1][1]).toBe(failures[1]);
    }
  );

  it('still deduplicates retry artifacts for Jest', async () => {
    const failures = [
      makeFailure(0, { testType: 'jest' }),
      makeFailure(0, { testType: 'jest', failure: 'retry of the same test' }),
    ];
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
  });
});

describe('processJUnitReports cascading failures', () => {
  const makeCascade = () => {
    const rootCause = makeFtrFailure(0);
    const cascading = [
      makeFtrFailure(1, { cascading: true }),
      makeFtrFailure(2, { cascading: true }),
    ];
    return { rootCause, cascading, failures: [rootCause, ...cascading] };
  };

  it('reports only the failure that aborted the run to GitHub', async () => {
    const { rootCause, failures } = makeCascade();
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue.mock.calls[0][1]).toBe(rootCause);
  });

  it('does not update tracked issues for cascading failures', async () => {
    const { cascading, failures } = makeCascade();
    getFailures.mockReturnValue(failures);
    // every cascading failure is already tracked, so without the guard each would be bumped
    const { params } = createParams(cascading.map(createExistingIssue));

    await processJUnitReports(['report.xml'], params);

    expect(updateFailureIssue).not.toHaveBeenCalled();
  });

  it('does not consume the FTR new-issue slot', async () => {
    const { cascading } = makeCascade();
    const firstNew = makeFtrFailure(3);
    const secondNew = makeFtrFailure(4);
    getFailures.mockReturnValue([...cascading, firstNew, secondNew]);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue.mock.calls[0][1]).toBe(firstNew);
  });

  it('still skips cascading Jest entries without capping other Jest failures', async () => {
    const failures = [
      makeFailure(0, { testType: 'jest', cascading: true }),
      makeFailure(1, { testType: 'jest' }),
      makeFailure(2, { testType: 'jest' }),
    ];
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(2);
    expect(createFailureIssue.mock.calls[0][1]).toBe(failures[1]);
    expect(createFailureIssue.mock.calls[1][1]).toBe(failures[2]);
  });

  it('still indexes them and hands them to the file reporter', async () => {
    const { failures } = makeCascade();
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(reportFailuresToEs.mock.calls[0][1]).toHaveLength(3);
    expect(reportFailuresToFile.mock.calls[0][1]).toHaveLength(3);
  });
});
