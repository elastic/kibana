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

import { createKibanaPlatformPluginsBuilder } from './build_kibana_platform_plugins';

const createConfig = ({
  testConfigCategory = ScoutTestRunConfigCategory.UI_TEST,
  alwaysUseSource = false,
  env = {},
}: {
  testConfigCategory?: ScoutTestRunConfigCategory;
  alwaysUseSource?: boolean;
  env?: NodeJS.ProcessEnv;
} = {}): KibanaTestServerLaunchConfig => ({
  get: (path: string) => {
    switch (path) {
      case 'testConfigCategory':
        return testConfigCategory;
      case 'kbnTestServer.runOptions.alwaysUseSource':
        return alwaysUseSource;
      case 'kbnTestServer.env':
        return env;
      default:
        throw new Error(`Unexpected config path: ${path}`);
    }
  },
});

const createProcRunner = () =>
  ({ run: jest.fn().mockResolvedValue(undefined) } as unknown as ProcRunner);

describe('createKibanaPlatformPluginsBuilder', () => {
  it('runs the cached Rspack build once', async () => {
    const procs = createProcRunner();
    const ensureBuilt = createKibanaPlatformPluginsBuilder();
    const options = {
      procs,
      config: createConfig(),
      env: { KBN_USE_RSPACK: 'true' },
    };

    await ensureBuilt(options);
    await ensureBuilt(options);

    expect(procs.run).toHaveBeenCalledTimes(1);
    expect(procs.run).toHaveBeenCalledWith('kibana-platform-plugins-build', {
      cmd: process.execPath,
      args: [Path.resolve(REPO_ROOT, 'scripts/build_rspack_bundles.js')],
      cwd: REPO_ROOT,
      env: { KBN_USE_RSPACK: 'true' },
      wait: true,
    });
  });

  it('uses the legacy build while the legacy optimizer is selected', async () => {
    const procs = createProcRunner();
    const ensureBuilt = createKibanaPlatformPluginsBuilder();
    const env = { KBN_USE_RSPACK: 'false' };

    await ensureBuilt({ procs, config: createConfig(), env });

    expect(procs.run).toHaveBeenCalledWith(
      'kibana-platform-plugins-build',
      expect.objectContaining({
        args: [Path.resolve(REPO_ROOT, 'scripts/build_kibana_platform_plugins.js')],
      })
    );
  });

  it('uses the environment configured for the Kibana test server', async () => {
    const procs = createProcRunner();
    const ensureBuilt = createKibanaPlatformPluginsBuilder();

    await ensureBuilt({
      procs,
      config: createConfig({ env: { KBN_USE_RSPACK: 'true' } }),
      env: { KBN_USE_RSPACK: 'false' },
    });

    expect(procs.run).toHaveBeenCalledWith(
      'kibana-platform-plugins-build',
      expect.objectContaining({
        args: [Path.resolve(REPO_ROOT, 'scripts/build_rspack_bundles.js')],
        env: { KBN_USE_RSPACK: 'true' },
      })
    );
  });

  it.each([
    {
      name: 'CI runs',
      config: createConfig(),
      env: { CI: 'true' },
      installDir: undefined,
    },
    {
      name: 'API tests',
      config: createConfig({ testConfigCategory: ScoutTestRunConfigCategory.API_TEST }),
      env: {},
      installDir: undefined,
    },
    {
      name: 'Kibana distributions',
      config: createConfig(),
      env: {},
      installDir: '/kibana',
    },
  ])('skips the build for $name', async ({ config, env, installDir }) => {
    const procs = createProcRunner();
    const ensureBuilt = createKibanaPlatformPluginsBuilder();

    await ensureBuilt({ procs, config, env, installDir });

    expect(procs.run).not.toHaveBeenCalled();
  });

  it('builds when a config with an install directory requires source', async () => {
    const procs = createProcRunner();
    const ensureBuilt = createKibanaPlatformPluginsBuilder();

    await ensureBuilt({
      procs,
      config: createConfig({ alwaysUseSource: true }),
      env: {},
      installDir: '/kibana',
    });

    expect(procs.run).toHaveBeenCalledTimes(1);
  });

  it('builds for uncategorized FTR configs', async () => {
    const procs = createProcRunner();
    const ensureBuilt = createKibanaPlatformPluginsBuilder();

    await ensureBuilt({
      procs,
      config: createConfig({ testConfigCategory: ScoutTestRunConfigCategory.UNKNOWN }),
      env: {},
    });

    expect(procs.run).toHaveBeenCalledTimes(1);
  });
});
