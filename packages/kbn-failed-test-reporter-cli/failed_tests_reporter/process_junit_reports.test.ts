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
  createSystemicFailureIssue: jest.fn(),
  updateFailureIssue: jest.fn(),
}));
jest.mock('./report_failures_to_es', () => ({ reportFailuresToEs: jest.fn() }));
jest.mock('./report_failures_to_file', () => ({ reportFailuresToFile: jest.fn() }));
jest.mock('./add_messages_to_report', () => ({ addMessagesToReport: jest.fn() }));

const { readTestReport, getRootMetadata } = jest.requireMock('./test_report');
const { getFailures } = jest.requireMock('./get_failures');
const { getReportMessageIter } = jest.requireMock('./report_metadata');
const { createFailureIssue, createSystemicFailureIssue, updateFailureIssue } =
  jest.requireMock('./report_failure');
const { reportFailuresToEs } = jest.requireMock('./report_failures_to_es');
const { reportFailuresToFile } = jest.requireMock('./report_failures_to_file');

const makeFailure = (i: number): TestFailure => ({
  classname: `suite ${i}`,
  name: `test ${i}`,
  failure: `failure ${i}`,
  time: '1.0',
  likelyIrrelevant: false,
});

const createParams = (existingFor: Map<TestFailure, ExistingFailedTestIssue>) => {
  const existingIssues = {
    loadForFailures: jest.fn(),
    getForFailure: jest.fn((failure: TestFailure) => existingFor.get(failure)),
    addNewlyCreated: jest.fn(),
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
  createSystemicFailureIssue.mockResolvedValue({ html_url: 'https://github.com/issues/999' });
  updateFailureIssue.mockResolvedValue({ newBody: 'body', newCount: 2 });
});

describe('processJUnitReports new-issue cap', () => {
  it('creates a new issue per failure when under the cap', async () => {
    const failures = Array.from({ length: 5 }, (_, i) => makeFailure(i));
    getFailures.mockReturnValue(failures);
    const { params } = createParams(new Map());

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(5);
    expect(createSystemicFailureIssue).not.toHaveBeenCalled();
  });

  it('skips new-issue creation and opens one systemic issue when the cap is exceeded', async () => {
    const failures = Array.from({ length: 11 }, (_, i) => makeFailure(i));
    getFailures.mockReturnValue(failures);
    const { params } = createParams(new Map());

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).not.toHaveBeenCalled();
    // A single umbrella issue is opened for the systemic failure.
    expect(createSystemicFailureIssue).toHaveBeenCalledTimes(1);
    // ES indexing and file reporting still run — that's real signal we keep.
    expect(reportFailuresToEs).toHaveBeenCalledTimes(1);
    expect(reportFailuresToFile).toHaveBeenCalledTimes(1);
  });

  it('still updates existing tracked issues when the cap is exceeded', async () => {
    const failures = Array.from({ length: 12 }, (_, i) => makeFailure(i));
    getFailures.mockReturnValue(failures);

    const existingFor = new Map<TestFailure, ExistingFailedTestIssue>();
    existingFor.set(failures[0], {
      classname: failures[0].classname,
      name: failures[0].name,
      github: { nodeId: 'a', number: 1, htmlUrl: 'https://github.com/issues/1', body: 'body' },
    });
    const { params } = createParams(existingFor);

    await processJUnitReports(['report.xml'], params);

    // 11 failures without an existing issue > cap of 10, so no new issues are opened.
    expect(createFailureIssue).not.toHaveBeenCalled();
    // The one tracked failure is still updated.
    expect(updateFailureIssue).toHaveBeenCalledTimes(1);
  });

  it('does not count failures with an existing issue toward the cap', async () => {
    const failures = Array.from({ length: 13 }, (_, i) => makeFailure(i));
    getFailures.mockReturnValue(failures);

    // 3 already tracked -> only 10 new, which is within the cap of 10.
    const existingFor = new Map<TestFailure, ExistingFailedTestIssue>();
    for (const failure of failures.slice(0, 3)) {
      existingFor.set(failure, {
        classname: failure.classname,
        name: failure.name,
        github: { nodeId: 'a', number: 1, htmlUrl: 'https://github.com/issues/1', body: 'body' },
      });
    }
    const { params } = createParams(existingFor);

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(10);
    expect(updateFailureIssue).toHaveBeenCalledTimes(3);
  });

  it('does not count likely-irrelevant failures toward the cap', async () => {
    const failures = Array.from({ length: 16 }, (_, i) => makeFailure(i));
    // Mark 6 as likely irrelevant -> only 10 real new failures, within the cap.
    for (const failure of failures.slice(0, 6)) {
      failure.likelyIrrelevant = true;
    }
    getFailures.mockReturnValue(failures);
    const { params } = createParams(new Map());

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(10);
  });
});
