/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Table from 'cli-table3';
import { ToolingLog } from '@kbn/tooling-log';
import { PreflightCheck } from '../checks/preflight_check';

export function renderCheckTable({ checks, log }: { checks: PreflightCheck[]; log: ToolingLog }) {
  const fileChangeSetTable = new Table({
    head: ['Test', 'Files'],
    colWidths: [15, 75],
    wordWrap: true,
    wrapOnWordBoundary: false,
  });

  fileChangeSetTable.push(
    ...checks.map((check) => [
      check.id,
      check
        .getFiles()
        .map((f) => f.path)
        .join('\n'),
    ])
  );

  log.info(`\n${fileChangeSetTable.toString()}\n`);
}
