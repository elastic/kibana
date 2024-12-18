/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FlagOptions, FlagsReader } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { SERVER_FLAG_OPTIONS, parseServerFlags } from '../../servers';
import { CliSupportedServerModes } from '../../types';
import { validatePlaywrightConfig } from './config_validator';

export interface RunTestsOptions {
  configPath: string;
  headed: boolean;
  mode: CliSupportedServerModes;
  esFrom: 'serverless' | 'source' | 'snapshot' | undefined;
  installDir: string | undefined;
  logsDir: string | undefined;
}

export const TEST_FLAG_OPTIONS: FlagOptions = {
  ...SERVER_FLAG_OPTIONS,
  boolean: [...(SERVER_FLAG_OPTIONS.boolean || []), 'headed'],
  string: [...(SERVER_FLAG_OPTIONS.string || []), 'config'],
  default: { headed: false },
  help: `${SERVER_FLAG_OPTIONS.help}
    --config             Playwright config file path
    --headed             Run Playwright with browser head
  `,
};

export async function parseTestFlags(flags: FlagsReader) {
  const options = parseServerFlags(flags);
  const configPath = flags.string('config');
  const headed = flags.boolean('headed');

  if (!configPath) {
    throw createFlagError(`Path to playwright config is required: --config <file path>`);
  }

  await validatePlaywrightConfig(configPath);

  return {
    ...options,
    configPath,
    headed,
  };
}
