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
import Path from 'path';

import { ToolingLog } from '@kbn/tooling-log';

import type { ScoutTestFailureExtended } from './get_scout_failures';
import type { ProcessReportsParams } from './process_reports_types';
import { processScoutReports, updateScoutHtmlReport } from './process_scout_reports';

jest.mock('./get_scout_failures', () => ({ getScoutFailures: jest.fn() }));
jest.mock('./report_failure', () => ({
  createFailureIssue: jest.fn(),
  updateFailureIssue: jest.fn(),
  updateSuiteIssue: jest.fn(),
}));
jest.mock('./report_failures_to_es', () => ({ reportFailuresToEs: jest.fn() }));

const { getScoutFailures } = jest.requireMock('./get_scout_failures');
const { createFailureIssue, updateFailureIssue } = jest.requireMock('./report_failure');
const { reportFailuresToEs } = jest.requireMock('./report_failures_to_es');

const createFailure = (
  overrides: Partial<ScoutTestFailureExtended> = {}
): ScoutTestFailureExtended => {
  return {
    id: 'failure-id',
    target: 'serverless-oblt',
    location: 'x-pack/test.ts',
    duration: 1234,
    owners: 'team:test',
    classname: 'suite name',
    name: 'test name',
    time: '1.23',
    failure: 'error message',
    likelyIrrelevant: false,
    ...overrides,
  };
};

describe('processScoutReports', () => {
  const createParams = (tracked: ScoutTestFailureExtended[] = []) =>
    ({
      log: new ToolingLog(),
      existingIssues: {
        loadForFailures: jest.fn(),
        getForFailure: jest.fn((failure: ScoutTestFailureExtended) =>
          tracked.some((t) => t.id === failure.id)
            ? { github: { htmlUrl: 'https://github.com/issues/1', body: 'body' } }
            : undefined
        ),
        getSuiteIssueForFailure: jest.fn(() => undefined),
        addNewlyCreated: jest.fn(),
      },
      buildUrl: 'https://build-url',
      githubApi: {},
      branch: 'main',
      pipeline: 'kibana-on-merge',
      prependTitle: '',
      updateGithub: true,
      perTestIssues: true,
      indexInEs: true,
      reportUpdate: false,
    } as unknown as ProcessReportsParams);

  beforeEach(() => {
    jest.clearAllMocks();
    createFailureIssue.mockResolvedValue({ html_url: 'https://github.com/issues/2' });
    updateFailureIssue.mockResolvedValue({ newBody: 'body', newCount: 2 });
  });

  it('opens an issue for a new failure and updates a tracked one', async () => {
    const tracked = createFailure({ id: 'tracked' });
    const fresh = createFailure({ id: 'fresh' });
    getScoutFailures.mockResolvedValue([tracked, fresh]);

    await processScoutReports(['/tmp/report.ndjson'], createParams([tracked]));

    expect(updateFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue.mock.calls[0][1]).toBe(fresh);
  });

  it('opens no issue for new failures when issue creation is off', async () => {
    const tracked = createFailure({ id: 'tracked' });
    const fresh = createFailure({ id: 'fresh' });
    getScoutFailures.mockResolvedValue([tracked, fresh]);
    const params = createParams([tracked]);
    params.perTestIssues = false;

    await processScoutReports(['/tmp/report.ndjson'], params);

    expect(updateFailureIssue).toHaveBeenCalledTimes(1);
    expect(createFailureIssue).not.toHaveBeenCalled();
    expect(fresh.failureCount).toBe(0);
    expect(reportFailuresToEs.mock.calls[0][1]).toHaveLength(2);
  });
});

describe('updateScoutHtmlReport', () => {
  it('updates the tracked branches line when a GitHub issue exists', () => {
    const tempDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'scout-html-'));
    const htmlPath = Path.join(tempDir, 'failure-id.html');
    const htmlTemplate = `
      <html>
        <body>
          <div class="section" id="tracked-branches-status">
            <strong>No failures found in tracked branches</strong>
          </div>
        </body>
      </html>
    `;
    fs.writeFileSync(htmlPath, htmlTemplate.trim(), 'utf-8');

    const failure = createFailure({
      githubIssue: 'https://github.com/elastic/kibana/issues/123',
      failureCount: 6,
    });

    updateScoutHtmlReport({
      log: new ToolingLog(),
      reportDir: tempDir,
      failure,
      reportUpdate: true,
    });

    const updatedContent = fs.readFileSync(htmlPath, 'utf-8');
    expect(updatedContent).toContain('Failures in tracked branches');
    expect(updatedContent).toContain('id="failure-count">6<');
    expect(updatedContent).toContain('https://github.com/elastic/kibana/issues/123');
  });

  it('explains why no GitHub issue was created when the failure is attributed to infra', () => {
    const tempDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'scout-html-'));
    const htmlPath = Path.join(tempDir, 'failure-id.html');
    const htmlTemplate = `
      <html>
        <body>
          <div class="section" id="tracked-branches-status">
            <strong>No failures found in tracked branches</strong>
          </div>
        </body>
      </html>
    `;
    fs.writeFileSync(htmlPath, htmlTemplate.trim(), 'utf-8');

    const failure = createFailure({
      likelyIrrelevant: true,
      infraReason: {
        category: 'cdn',
        message: 'Kibana bundles failed to load from the CDN <chunk 1> & more.',
      },
    });

    updateScoutHtmlReport({
      log: new ToolingLog(),
      reportDir: tempDir,
      failure,
      reportUpdate: true,
    });

    const updatedContent = fs.readFileSync(htmlPath, 'utf-8');
    expect(updatedContent).toContain('Likely infrastructure issue (cdn), no GitHub issue created');
    expect(updatedContent).toContain('the CDN &lt;chunk 1&gt; &amp; more.');
    expect(updatedContent).not.toContain('No failures found in tracked branches');
  });
});
