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

import { generateScoutTestFailureArtifacts } from './generate_scout_test_failure_artifacts';

const REPORT_DIR = Path.join(
  '.scout',
  'reports',
  'scout-playwright-test-failures-2024-01-01T00-00-00'
);

const htmlWithGithubIssue = (issueUrl: string, failureCount: number) => `
  <html>
    <body>
      <div class="section" id="tracked-branches-status">
        <strong>Failures in tracked branches</strong>:
        <span class="badge rounded-pill bg-danger" id="failure-count">${failureCount}</span>
        <a id="github-issue-link" href="${issueUrl}" target="_blank">${issueUrl}</a>
      </div>
    </body>
  </html>
`;

const htmlWithoutGithubIssue = `
  <html>
    <body>
      <div class="section" id="tracked-branches-status">
        <strong>No failures found in tracked branches</strong>
      </div>
    </body>
  </html>
`;

const readArtifactFor = (name: string) => {
  const files = fs.readdirSync(Path.join('target', 'test_failures'));
  const jsonFiles = files.filter((file) => file.endsWith('.json'));
  for (const file of jsonFiles) {
    const content = JSON.parse(
      fs.readFileSync(Path.join('target', 'test_failures', file), 'utf-8')
    );
    if (content.name === name) {
      return content;
    }
  }
  throw new Error(`No artifact found for "${name}"`);
};

describe('generateScoutTestFailureArtifacts', () => {
  let tempDir: string;
  let prevCwd: string;

  beforeEach(() => {
    prevCwd = process.cwd();
    tempDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'scout-artifacts-'));
    process.chdir(tempDir);

    const reportDir = Path.join(tempDir, REPORT_DIR);
    fs.mkdirSync(reportDir, { recursive: true });

    fs.writeFileSync(
      Path.join(reportDir, 'with-issue.html'),
      htmlWithGithubIssue('https://github.com/elastic/kibana/issues/123', 6),
      'utf-8'
    );
    fs.writeFileSync(Path.join(reportDir, 'without-issue.html'), htmlWithoutGithubIssue, 'utf-8');
    fs.writeFileSync(
      Path.join(reportDir, 'test-failures-summary.json'),
      JSON.stringify([
        { name: 'suite - tracked failure', htmlReportFilename: 'with-issue.html' },
        { name: 'suite - untracked failure', htmlReportFilename: 'without-issue.html' },
      ]),
      'utf-8'
    );
  });

  afterEach(() => {
    process.chdir(prevCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('carries the GitHub issue link and failure count into the artifact', async () => {
    await generateScoutTestFailureArtifacts({ log: new ToolingLog(), bkMeta: {} });

    const artifact = readArtifactFor('suite - tracked failure');
    expect(artifact.githubIssue).toBe('https://github.com/elastic/kibana/issues/123');
    expect(artifact.failureCount).toBe(6);
  });

  it('omits the GitHub fields when the report has no tracked issue', async () => {
    await generateScoutTestFailureArtifacts({ log: new ToolingLog(), bkMeta: {} });

    const artifact = readArtifactFor('suite - untracked failure');
    expect(artifact).not.toHaveProperty('githubIssue');
    expect(artifact).not.toHaveProperty('failureCount');
  });
});
