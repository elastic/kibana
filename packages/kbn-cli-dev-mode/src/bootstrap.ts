/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { CliArgs, Env, RawConfigAdapter } from '@kbn/config';
import { CliDevMode } from './cli_dev_mode';
import { CliLog } from './log';
import { convertToLogger } from './log_adapter';
import { loadConfig } from './config';

interface BootstrapArgs {
  configs: string[];
  cliArgs: CliArgs;
  applyConfigOverrides: RawConfigAdapter;
}

export async function bootstrapDevMode({ configs, cliArgs, applyConfigOverrides }: BootstrapArgs) {
  const log = new CliLog(!!cliArgs.silent);

  const env = Env.createDefault(REPO_ROOT, {
    configs,
    cliArgs,
  });

  const config = await loadConfig({
    env,
    logger: convertToLogger(log),
    rawConfigAdapter: applyConfigOverrides,
  });

  const cliDevMode = new CliDevMode({
    cliArgs,
    config,
    log,
  });

  await cliDevMode.start();
}
