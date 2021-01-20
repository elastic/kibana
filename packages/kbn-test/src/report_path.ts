/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { CI_PARALLEL_PROCESS_PREFIX } from './ci_parallel_process_prefix';

export function getUniqueJunitReportPath(
  rootDirectory: string,
  reportName: string,
  counter?: number
): string {
  const path = Path.resolve(
    rootDirectory,
    'target/junit',
    process.env.JOB || '.',
    `TEST-${CI_PARALLEL_PROCESS_PREFIX}${reportName}${counter ? `-${counter}` : ''}.xml`
  );

  return Fs.existsSync(path)
    ? getUniqueJunitReportPath(rootDirectory, reportName, (counter ?? 0) + 1)
    : path;
}
