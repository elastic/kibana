/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError, isFailError } from '@kbn/dev-cli-errors';
import {
  buildScoutArgsForVisualRun,
  discoverAllVisualRunSelections,
  discoverSelectedVisualRunSelections,
  discoverVisualTestFilesForConfig,
  formatVisualRunSelectionsList,
  getRunTestsHelpText,
  hasVisualTestDependency,
  parseVisualRunTestsArgs,
  promptForVisualRunSelection,
  runVisualTestsCommand,
} from './run_tests';

const getHelpText = (): string => `Scout VRT CLI

Commands:
  run-tests    Run visual Scout suites and enable visual regression mode

Usage:
  node scripts/scout_vrt run-tests
  node scripts/scout_vrt run-tests --arch stateful --domain classic --config <playwright_config_path>
  node scripts/scout_vrt run-tests --arch stateful --domain classic --testFiles <spec_path_or_directory>`;

const shouldPrintHelp = (command: string | undefined, args: string[]): boolean =>
  command === undefined ||
  command === 'help' ||
  args.some((arg) => arg === '--help' || arg === '-h');

const printError = (message: string, helpText: string) => {
  process.stderr.write(`${message}\n\n${helpText}\n`);
};

export async function run() {
  const [command, ...args] = process.argv.slice(2);

  try {
    if (shouldPrintHelp(command, args) && command !== 'run-tests') {
      process.stdout.write(`${getHelpText()}\n`);
      return;
    }

    switch (command) {
      case 'run-tests':
        await runVisualTestsCommand(args);
        return;
      default:
        throw createFlagError(`Unknown command '${command}'`);
    }
  } catch (error) {
    if (isFailError(error)) {
      printError(error.message, command === 'run-tests' ? getRunTestsHelpText() : getHelpText());
      process.exitCode = error.exitCode;
      return;
    }

    throw error;
  }
}

export {
  buildScoutArgsForVisualRun,
  discoverAllVisualRunSelections,
  discoverSelectedVisualRunSelections,
  discoverVisualTestFilesForConfig,
  formatVisualRunSelectionsList,
  getRunTestsHelpText,
  hasVisualTestDependency,
  parseVisualRunTestsArgs,
  promptForVisualRunSelection,
  runVisualTestsCommand,
};

export type { ParsedVisualRunTestsArgs, VisualRunSelection } from './run_tests';
