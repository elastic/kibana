/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { Env, type RawPackageInfo, type EnvOptions } from '@kbn/config';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer R> ? Array<DeepPartial<R>> : DeepPartial<T[P]>;
};

export function getEnvOptions(options: DeepPartial<EnvOptions> = {}): EnvOptions {
  return {
    configs: options.configs || [],
    cliArgs: {
      dev: true,
      silent: false,
      watch: false,
      basePath: false,
      disableOptimizer: true,
      cache: true,
      dist: false,
      oss: false,
      runExamples: false,
      ...(options.cliArgs || {}),
    },
  };
}

export const createTestPackageInfo = ({ dist = true }: { dist?: boolean } = {}): RawPackageInfo => {
  return {
    branch: 'test-branch',
    version: '8.66-test',
    build: {
      distributable: dist,
      number: 123456789,
      sha: 'XXXXXX',
    },
  };
};

export const createTestEnv = ({
  repoRoot = REPO_ROOT,
  envOptions = getEnvOptions(),
  packageInfo = createTestPackageInfo(),
}: {
  repoRoot?: string;
  envOptions?: EnvOptions;
  packageInfo?: RawPackageInfo;
} = {}) => {
  return Env.createDefault(repoRoot, envOptions, packageInfo);
};
