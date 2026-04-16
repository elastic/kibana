/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import inquirer from 'inquirer';
import type { VisualRunSelection } from './visual_test_discovery';

const EXIT_SELECTION_VALUE = '__exit__';

export const isInteractiveTerminal = (): boolean =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY);

export const formatVisualRunSelectionsList = (selections: VisualRunSelection[]): string => {
  const header =
    selections.length === 0
      ? 'No VRT-enabled Scout configs were found.'
      : `Found ${selections.length} VRT-enabled Scout config(s):`;
  const lines = [header];

  if (selections.length > 0) {
    lines.push('');
    lines.push(
      ...selections.map(
        ({ configPath, visualTestFiles }) =>
          `- ${configPath} (${visualTestFiles.length} visual spec${
            visualTestFiles.length === 1 ? '' : 's'
          })`
      )
    );
  }

  lines.push('');
  lines.push('Run one config with:');
  lines.push(
    '  node scripts/scout_vrt run-tests --arch stateful --domain classic --config <playwright_config_path>'
  );
  lines.push('Run a selected spec or directory with:');
  lines.push(
    '  node scripts/scout_vrt run-tests --arch stateful --domain classic --testFiles <spec_path_or_directory>'
  );

  return lines.join('\n');
};

const formatVisualRunSelectionChoice = ({
  configPath,
  visualTestFiles,
}: VisualRunSelection): string =>
  `${configPath} (${visualTestFiles.length} visual spec${visualTestFiles.length === 1 ? '' : 's'})`;

export const promptForVisualRunSelection = async (
  selections: VisualRunSelection[]
): Promise<VisualRunSelection | undefined> => {
  const { selectedConfigPath } = await inquirer.prompt<{ selectedConfigPath: string }>({
    type: 'list',
    name: 'selectedConfigPath',
    message: 'Select a VRT-enabled Scout config to run:',
    pageSize: Math.min(10, selections.length + 1),
    choices: [
      ...selections.map((selection) => ({
        name: formatVisualRunSelectionChoice(selection),
        value: selection.configPath,
        short: selection.configPath,
      })),
      {
        name: 'Exit without running',
        value: EXIT_SELECTION_VALUE,
        short: 'exit',
      },
    ],
  });

  if (selectedConfigPath === EXIT_SELECTION_VALUE) {
    return;
  }

  return selections.find(({ configPath }) => configPath === selectedConfigPath);
};
