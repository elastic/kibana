/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import globby from 'globby';
import fs from 'fs';
import { createHash } from 'crypto';
import { ToolingLog } from '@kbn/tooling-log';
import { BuildkiteMetadata } from './buildkite_metadata';

const SCOUT_TEST_FAILURE_DIR_PATTERN = '.scout/reports/scout-playwright-test-failures-*';
const SUMMARY_REPORT_FILENAME = 'test-failures-summary.json';

export async function generateScoutTestFailureArtifacts({
  log,
  bkMeta,
}: {
  log: ToolingLog;
  bkMeta: BuildkiteMetadata;
}) {
  log.info('Searching for Scout test failure reports');

  const dirs = await globby(SCOUT_TEST_FAILURE_DIR_PATTERN, {
    onlyDirectories: true,
  });

  if (dirs.length === 0) {
    log.info(`No directories found matching pattern: ${SCOUT_TEST_FAILURE_DIR_PATTERN}`);
    return;
  }

  log.info(`Found ${dirs.length} directories matching pattern: ${SCOUT_TEST_FAILURE_DIR_PATTERN}`);
  for (const dirPath of dirs) {
    const summaryFilePath = Path.join(dirPath, SUMMARY_REPORT_FILENAME);
    // Check if summary JSON exists
    if (!fs.existsSync(summaryFilePath)) {
      throw new Error(`Summary file not found in: ${dirPath}`);
    }

    const summaryData: Array<{ name: string; htmlReportFilename: string }> = JSON.parse(
      fs.readFileSync(summaryFilePath, 'utf-8')
    );

    log.info(`Creating failure artifacts for report in ${dirPath}`);
    for (const { name, htmlReportFilename } of summaryData) {
      const htmlFilePath = Path.join(dirPath, htmlReportFilename);
      const failureHTML = fs.readFileSync(htmlFilePath, 'utf-8');

      const hash = createHash('md5').update(name).digest('hex'); // eslint-disable-line @kbn/eslint/no_unsafe_hash
      const filenameBase = `${
        process.env.BUILDKITE_JOB_ID ? process.env.BUILDKITE_JOB_ID + '_' : ''
      }${hash}`;
      const dir = Path.join('target', 'test_failures');
      const failureJSON = JSON.stringify(
        {
          name,
          hash,
          buildId: bkMeta.buildId,
          jobId: bkMeta.jobId,
          url: bkMeta.url,
          jobUrl: bkMeta.jobUrl,
          jobName: bkMeta.jobName,
        },
        null,
        2
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(Path.join(dir, `${filenameBase}.html`), failureHTML, 'utf8');
      fs.writeFileSync(Path.join(dir, `${filenameBase}.json`), failureJSON, 'utf8');
    }
  }
}
