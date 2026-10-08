/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import type { ProcRunner } from '@kbn/dev-proc-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { KibanaTestServerLaunchConfig } from '@kbn/test-kibana-server';

interface EnsureKibanaPlatformPluginsBuiltOptions {
  procs: ProcRunner;
  config: KibanaTestServerLaunchConfig;
  installDir?: string;
  env?: NodeJS.ProcessEnv;
}

type EnsureKibanaPlatformPluginsBuilt = (
  options: EnsureKibanaPlatformPluginsBuiltOptions
) => Promise<void>;

const shouldBuildKibanaPlatformPlugins = ({
  config,
  installDir,
  env,
}: Omit<EnsureKibanaPlatformPluginsBuiltOptions, 'procs'>): boolean => {
  const testConfigCategory = config.get('testConfigCategory');
  const requiresBrowserBundles =
    testConfigCategory === ScoutTestRunConfigCategory.UI_TEST ||
    testConfigCategory === ScoutTestRunConfigCategory.UNKNOWN;
  const alwaysUseSource = config.get('kbnTestServer.runOptions.alwaysUseSource') === true;
  const runsFromSource = alwaysUseSource || installDir === undefined;

  return !env?.CI && runsFromSource && requiresBrowserBundles;
};

export const createKibanaPlatformPluginsBuilder = (): EnsureKibanaPlatformPluginsBuilt => {
  let buildPromise: Promise<void> | undefined;

  return async ({
    procs,
    config,
    installDir,
    env = process.env,
  }: EnsureKibanaPlatformPluginsBuiltOptions): Promise<void> => {
    const buildEnv = {
      ...env,
      ...(config.get('kbnTestServer.env') as NodeJS.ProcessEnv),
    };

    if (!shouldBuildKibanaPlatformPlugins({ config, installDir, env: buildEnv })) {
      return;
    }

    if (!buildPromise) {
      buildPromise = procs.run('kibana-platform-plugins-build', {
        cmd: process.execPath,
        args: [
          Path.resolve(REPO_ROOT, 'scripts/build_kibana_platform_plugins.js'),
          '--examples',
          '--test-plugins',
        ],
        cwd: REPO_ROOT,
        env: buildEnv,
        wait: true,
      });
    }

    await buildPromise;
  };
};
