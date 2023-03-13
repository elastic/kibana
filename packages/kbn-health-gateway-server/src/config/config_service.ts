/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromRoot, REPO_ROOT } from '@kbn/repo-info';
import type { LoggerFactory } from '@kbn/logging';
import { getPackages } from '@kbn/repo-packages';
import { ConfigService as KbnConfigService, CliArgs, Env, RawConfigService } from '@kbn/config';
import { getArgValues } from './read_argv';

const CONFIG_CLI_FLAGS = ['-c', '--config'];
const DEFAULT_CONFIG_PATH = fromRoot('config/gateway.yml');

// These `cliArgs` are required by `Env` for use with Kibana,
// however they have no effect on the health gateway.
const KIBANA_CLI_ARGS: CliArgs = {
  dev: false,
  silent: false,
  watch: false,
  basePath: false,
  disableOptimizer: true,
  cache: false,
  dist: false,
  oss: false,
  runExamples: false,
};

export function getConfigService({ logger }: { logger: LoggerFactory }) {
  const configPathOverride = getArgValues(process.argv, CONFIG_CLI_FLAGS);
  const configPath = configPathOverride.length ? configPathOverride : [DEFAULT_CONFIG_PATH];

  const rawConfigService = new RawConfigService(configPath);
  rawConfigService.loadConfig();

  const env = Env.createDefault(REPO_ROOT, {
    configs: configPath,
    cliArgs: KIBANA_CLI_ARGS,
    repoPackages: getPackages(REPO_ROOT),
  });

  return new KbnConfigService(rawConfigService, env, logger);
}
