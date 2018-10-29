/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ToolingLog } from '@kbn/dev-utils';

const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

export async function run(checker: (log: ToolingLog) => boolean | Promise<boolean>) {
  try {
    if (!(await checker(log))) {
      process.exit(1);
    }
  } catch (error) {
    log.error(error);
    process.exit(1);
  }
}
