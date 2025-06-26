/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Table from 'cli-table3';
import simpleGit from 'simple-git';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

export async function checkIfBranchIsClean({ log }: { log: ToolingLog }) {
  const git = simpleGit(REPO_ROOT);

  if (!(await git.branchLocal().status()).isClean()) {
    const warning = new Table({
      head: ['Warning: You have changes on your branch that are not committed or stashed!'],
      chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      colWidths: [80],
      wordWrap: true,
      wrapOnWordBoundary: true,
    });

    warning.push([
      `Preflight checks will be performed on your files including these changes. 
  This might influence the outcome of these tests.
  `,
    ]);

    warning.push(['']);

    warning.push([
      'The checks will still run, but for the most accurate results either commit your changes, stash them, or reset your branch to HEAD before running this script.',
    ]);

    log.warning(`${warning.toString()}\n`);
  }
}
