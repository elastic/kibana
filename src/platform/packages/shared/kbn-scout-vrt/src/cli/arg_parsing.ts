/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError } from '@kbn/dev-cli-errors';

const HELP_FLAGS = new Set(['--help', '-h']);

export interface ParsedVisualRunTestsArgs {
  configPath?: string;
  forwardedArgs: string[];
  helpRequested: boolean;
  testFilesList?: string;
}

const parseFlagValue = (rawValue: string | undefined, flagName: string): string => {
  if (!rawValue || rawValue.startsWith('--')) {
    throw createFlagError(`Missing value for '--${flagName}'`);
  }

  return rawValue;
};

export const parseVisualRunTestsArgs = (rawArgs: string[]): ParsedVisualRunTestsArgs => {
  const forwardedArgs: string[] = [];
  let configPath: string | undefined;
  let testFilesList: string | undefined;
  let helpRequested = false;

  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];

    if (HELP_FLAGS.has(arg)) {
      helpRequested = true;
      continue;
    }

    if (arg === '--config') {
      if (configPath !== undefined) {
        throw createFlagError(`Expected a single '--config' flag`);
      }

      configPath = parseFlagValue(rawArgs[++index], 'config');
      continue;
    }

    if (arg.startsWith('--config=')) {
      if (configPath !== undefined) {
        throw createFlagError(`Expected a single '--config' flag`);
      }

      configPath = parseFlagValue(arg.slice('--config='.length), 'config');
      continue;
    }

    if (arg === '--testFiles') {
      if (testFilesList !== undefined) {
        throw createFlagError(`Expected a single '--testFiles' flag`);
      }

      testFilesList = parseFlagValue(rawArgs[++index], 'testFiles');
      continue;
    }

    if (arg.startsWith('--testFiles=')) {
      if (testFilesList !== undefined) {
        throw createFlagError(`Expected a single '--testFiles' flag`);
      }

      testFilesList = parseFlagValue(arg.slice('--testFiles='.length), 'testFiles');
      continue;
    }

    forwardedArgs.push(arg);
  }

  if (!helpRequested && configPath && testFilesList) {
    throw createFlagError(`Cannot use both '--config' and '--testFiles' at the same time`);
  }

  return {
    configPath,
    forwardedArgs,
    helpRequested,
    testFilesList,
  };
};
