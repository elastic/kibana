/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';

import { parseFlags as parseRunTestFlags } from '../run_tests/flags';

export type StartServerOptions = ReturnType<typeof parseFlags>;

export function parseFlags(flags: FlagsReader) {
  const { configs, esFrom, esVersion, installDir, logsDir } = parseRunTestFlags(flags);

  if (configs.length !== 1) {
    throw createFlagError(`expected exactly one --config or --journey flag`);
  }

  return {
    config: configs[0],
    esFrom,
    esVersion,
    installDir,
    logsDir,
  };
}
