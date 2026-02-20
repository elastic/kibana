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
import { updateScoutHtmlReport } from './process_scout_reports';

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
});
