/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { parseCliOptions } from './lib/parse_cli_options';
import { CliOptions } from './types';
import { run } from './run';

export async function cli(cliOptions?: CliOptions) {
  const options = cliOptions ?? parseCliOptions();
  const logger = new ToolingLog({ level: 'info', writeTo: process.stdout });
  return run(options, logger);
}
