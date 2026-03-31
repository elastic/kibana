/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestTarget } from '@kbn/scout-info';

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

/**
 * Returns the command line used to run Scout tests.
 *
 * When Scout starts Playwright, the Playwright process argv no longer contains the Scout CLI invocation.
 * In those cases, Scout sets SCOUT_RUN_COMMAND and we prefer it for reporting.
 */
export function getRunCommand(argv: string[] = process.argv): string {
  const scoutRunCommand = process.env.SCOUT_RUN_COMMAND;
  if (typeof scoutRunCommand === 'string' && scoutRunCommand.trim() !== '') {
    return scoutRunCommand;
  }

  try {
    return stripRunCommand(argv);
  } catch {
    // As a last resort, avoid failing reporting; show the raw argv.
    return Array.isArray(argv) ? argv.join(' ') : '';
  }
}

/**
 * Tries to determine the Scout test target from process attributes.
 *
 * @param argv Process argument values
 *
 * @return ScoutTestTarget if necessary information was found in process arguments
 *
 * This won't return a target if '--grep' is not provided in the command line
 */
export function getTestTargetFromProcessArguments(
  argv: string[] = process.argv
): ScoutTestTarget | undefined {
  // Fallback to parsing command line arguments
  // Try to find --grep argument in different formats
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    let tag;

    // Handle --grep=@tag format
    if (arg.startsWith('--grep=')) {
      tag = arg.split('=')[1];
    }
    // Handle --grep @tag format
    else if (arg === '--grep' && i + 1 < argv.length) {
      tag = argv[i + 1];
    }

    if (tag) {
      try {
        return ScoutTestTarget.fromTag(tag);
      } catch (e) {
        // Whatever we found, it's not good.
      }
    }
  }
}
