/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

export function getRunTarget(argv: string[] = process.argv): string {
  // First, try to get the target from the environment variable (set by the scout run-tests command)
  if (process.env.SCOUT_TARGET_MODE) {
    // Convert mode format (e.g. "serverless=oblt" to display format "serverless-oblt")
    const mode = process.env.SCOUT_TARGET_MODE;
    if (mode === 'stateful') {
      return 'stateful';
    }
    if (mode.startsWith('serverless=')) {
      return mode.replace('=', '-');
    }
    return mode;
  }

  // Fallback to parsing command line arguments
  const tagsToMode: Record<string, string> = {
    '@ess': 'stateful',
    '@svlSearch': 'serverless-search',
    '@svlOblt': 'serverless-oblt',
    '@svlLogsEssentials': 'serverless-oblt-logs-essentials',
    '@svlSecurity': 'serverless-security',
    '@svlSecurityEssentials': 'serverless-security-essentials',
    '@svlSecurityEase': 'serverless-security-ease',
  };

  // Try to find --grep argument in different formats
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // Handle --grep=@tag format
    if (arg.startsWith('--grep=')) {
      const tag = arg.split('=')[1];
      if (tag && tagsToMode[tag]) {
        return tagsToMode[tag];
      }
    }

    // Handle --grep @tag format
    if (arg === '--grep' && i + 1 < argv.length) {
      const tag = argv[i + 1];
      if (tag && tagsToMode[tag]) {
        return tagsToMode[tag];
      }
    }
  }

  return 'undefined';
}
