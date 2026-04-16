/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import { type ParsedVisualRunTestsArgs, parseVisualRunTestsArgs } from './arg_parsing';
import { executeVisualRunSelection, buildScoutArgsForVisualRun } from './scout_runner';
import {
  formatVisualRunSelectionsList,
  isInteractiveTerminal,
  promptForVisualRunSelection,
} from './selection_prompt';
import {
  type VisualRunSelection,
  discoverAllVisualRunSelections,
  discoverSelectedVisualRunSelections,
  discoverVisualTestFilesForConfig,
  hasVisualTestDependency,
} from './visual_test_discovery';

interface DefaultSelectionResult {
  listedSelections: boolean;
  selection?: VisualRunSelection;
}

const getDefaultSelectionResult = async (): Promise<DefaultSelectionResult> => {
  const selections = await discoverAllVisualRunSelections();

  if (selections.length === 0 || !isInteractiveTerminal()) {
    process.stdout.write(`${formatVisualRunSelectionsList(selections)}\n`);
    return {
      listedSelections: true,
    };
  }

  return {
    listedSelections: false,
    selection: await promptForVisualRunSelection(selections),
  };
};

const getSelectedVisualRun = async (
  parsedArgs: ParsedVisualRunTestsArgs
): Promise<VisualRunSelection> => {
  const [selection] = await discoverSelectedVisualRunSelections(parsedArgs);

  if (!selection || selection.visualTestFiles.length === 0) {
    throw createFlagError('No visual tests found for the provided selection');
  }

  return selection;
};

export const getRunTestsHelpText = (): string => `Run only visual Scout suites and enable VRT.

Usage:
  node scripts/scout_vrt run-tests
  node scripts/scout_vrt run-tests --arch stateful --domain classic --config <playwright_config_path>
  node scripts/scout_vrt run-tests --arch stateful --domain classic --testFiles <spec_path_or_directory>

All other flags are forwarded to 'node scripts/scout run-tests'.
Visual specs are discovered by following each spec's local imports until a dependency on '@kbn/scout-vrt' is found.
Run without '--config' or '--testFiles' to select a VRT-enabled Scout config in interactive shells, or list them otherwise.
This command captures visual artifacts and manifests for the selected suites; baseline generation and comparison are added in follow-on CI work.`;

export const runVisualTestsCommand = async (rawArgs: string[]) => {
  const parsedArgs = parseVisualRunTestsArgs(rawArgs);

  if (parsedArgs.helpRequested) {
    process.stdout.write(`${getRunTestsHelpText()}\n`);
    return;
  }

  if (!parsedArgs.configPath && !parsedArgs.testFilesList) {
    const { listedSelections, selection } = await getDefaultSelectionResult();

    if (listedSelections) {
      return;
    }

    if (!selection) {
      process.stdout.write('scout_vrt: no config selected\n');
      return;
    }

    await executeVisualRunSelection(parsedArgs, selection);
    return;
  }

  await executeVisualRunSelection(parsedArgs, await getSelectedVisualRun(parsedArgs));
};

export {
  buildScoutArgsForVisualRun,
  discoverAllVisualRunSelections,
  discoverSelectedVisualRunSelections,
  discoverVisualTestFilesForConfig,
  formatVisualRunSelectionsList,
  hasVisualTestDependency,
  parseVisualRunTestsArgs,
  promptForVisualRunSelection,
};

export type { ParsedVisualRunTestsArgs, VisualRunSelection };
