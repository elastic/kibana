/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { TestFailure } from '../test_failure';

export const saveTestFailuresReport = (
  testFailures: TestFailure[],
  reportRootPath: string,
  filename: string,
  log: ToolingLog
): void => {
  try {
    const reportPath = path.join(reportRootPath, filename);
    fs.mkdirSync(reportRootPath, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ failures: testFailures }, null, 2), 'utf-8');
    log.info(`Saving Scout failed test report to ${reportPath}`);
  } catch (error) {
    log.error(`Failed to save report at ${reportRootPath}: ${error.message}`);
  }
};
