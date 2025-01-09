/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { ToolingLog } from '@kbn/tooling-log';

export const saveTestFailuresReport = (
  reportPath: string,
  testFailureHtml: string,
  log: ToolingLog,
  message: string
): void => {
  try {
    fs.writeFileSync(reportPath, testFailureHtml, 'utf-8');
    log.info(message);
  } catch (error) {
    log.error(`Failed to save report at ${reportPath}: ${error.message}`);
  }
};
