/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { PreflightCheck } from '../checks/preflight_check';

export function renderTestSummary({
  startTime,
  log,
  tests,
}: {
  startTime: [number, number];
  log: ToolingLog;
  tests: PreflightCheck[];
}) {
  const endTime = process.hrtime(startTime);
  const elapsedTimeInSeconds = endTime[0] + endTime[1] / 1e9;

  log.info(
    `Performed ${tests
      .filter((test) => test.getFiles().length)
      .map((test, index, arr) => {
        const count = Number(test.getFiles().length);
        const prefix = index === arr.length - 1 ? 'and ' : '';

        return `${prefix}${count} ${test.id} ${count === 1 ? 'check' : 'checks'}${
          prefix ? '' : ','
        } `;
      })
      .join('')
      .slice(0, -1)} in ${elapsedTimeInSeconds.toFixed(2)} seconds.\n`
  );
}
