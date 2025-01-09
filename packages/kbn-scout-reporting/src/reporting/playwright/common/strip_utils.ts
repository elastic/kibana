/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripANSI from 'strip-ansi';
import { REPO_ROOT } from '@kbn/repo-info';

export const stripFilePath = (filePath: string): string =>
  stripANSI(filePath.replaceAll(`${REPO_ROOT}/`, ''));

export const stripRunCommand = (commandArgs: string[]): string => {
  if (!Array.isArray(commandArgs) || commandArgs.length < 3) {
    throw new Error(`Invalid command arguments: must include at least 'npx playwright test'`);
  }

  const isNodeCommand = commandArgs[0].endsWith('node');
  const isNpxCommand = commandArgs[0] === 'npx' && commandArgs[1] === 'playwright';

  if (!isNodeCommand && !isNpxCommand) {
    throw new Error(
      'Invalid command structure: Expected "node <playwright_path> test" or "npx playwright test".'
    );
  }

  const restArgs = commandArgs.slice(2);
  // Rebuild the command with only valid arguments
  return `npx playwright ${restArgs.join(' ')}`;
};
