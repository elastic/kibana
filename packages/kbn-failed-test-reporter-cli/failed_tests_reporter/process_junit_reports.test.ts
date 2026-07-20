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
  createSystemicFailureIssue.mockResolvedValue({ html_url: 'https://github.com/issues/999' });
  updateFailureIssue.mockResolvedValue({ newBody: 'body', newCount: 2 });
});

describe('processJUnitReports new-issue cap', () => {
  it('creates one new issue when the report has a single unique new failure', async () => {
    const failures = [makeFailure(0)];
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(createSystemicFailureIssue).not.toHaveBeenCalled();
  });

  it('skips new-issue creation and opens one systemic issue when more than one unique new failure would open an issue', async () => {
    const failures = [makeFailure(0), makeFailure(1)];
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).not.toHaveBeenCalled();
    // A single umbrella issue is opened for the systemic failure.
    expect(createSystemicFailureIssue).toHaveBeenCalledTimes(1);
    // ES indexing and file reporting still run — that's real signal we keep.
    expect(reportFailuresToEs).toHaveBeenCalledTimes(1);
    expect(reportFailuresToFile).toHaveBeenCalledTimes(1);
  });

  it('still updates existing tracked issues when the cap is exceeded', async () => {
    const failures = [makeFailure(0), makeFailure(1), makeFailure(2)];
    getFailures.mockReturnValue(failures);

    const { params } = createParams([createExistingIssue(failures[0])]);

    await processJUnitReports(['report.xml'], params);

    // 2 failures without an existing issue > cap of 1, so no new per-test issues are opened.
    expect(createFailureIssue).not.toHaveBeenCalled();
    // The one tracked failure is still updated.
    expect(updateFailureIssue).toHaveBeenCalledTimes(1);
  });

  it('does not count failures with an existing issue toward the cap', async () => {
    const failures = [makeFailure(0), makeFailure(1), makeFailure(2)];
    getFailures.mockReturnValue(failures);

    // 2 already tracked -> only 1 new, which is within the cap of 1.
    const { params } = createParams(failures.slice(0, 2).map(createExistingIssue));

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(updateFailureIssue).toHaveBeenCalledTimes(2);
  });

  it('does not count likely-irrelevant failures toward the cap', async () => {
    const failures = [makeFailure(0), makeFailure(1)];
    // Mark 1 as likely irrelevant -> only 1 real new failure, within the cap.
    failures[0].likelyIrrelevant = true;
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createFailureIssue).toHaveBeenCalledTimes(1);
  });

  it('counts duplicate failures as one unique new issue', async () => {
    const failures = [
      makeFailure(0),
      {
        ...makeFailure(0),
        failure: 'another failure entry for the same test',
      },
    ];
    getFailures.mockReturnValue(failures);
    const { params } = createParams();

    await processJUnitReports(['report.xml'], params);

    expect(createSystemicFailureIssue).not.toHaveBeenCalled();
    expect(createFailureIssue).toHaveBeenCalledTimes(1);
  });
});
