/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import { join } from 'path';
import { build } from '@storybook/core-server';
import type { CLIOptions, BuilderOptions, LoadOptions } from '@storybook/types';
import type { Flags } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { runSharedBuild } from '@kbn/rspack-optimizer';
import * as constants from './constants';

type StorybookCliOptions = CLIOptions & BuilderOptions & LoadOptions & { mode: 'dev' | 'static' };

// Convert the flags to a Storybook loglevel
export function getLogLevelFromFlags(flags: Flags) {
  if (flags.debug) {
    return 'silly';
  }
  if (flags.verbose) {
    return 'verbose';
  }
  if (flags.quiet) {
    return 'warn';
  }
  if (flags.silent) {
    return 'silent';
  }
  return 'info';
}

export async function buildStorybook({
  configDir,
  name,
  site = false,
  sharedBundlesPrebuilt = false,
  loglevel = 'info',
}: {
  configDir: string;
  name: string;
  site?: boolean;
  sharedBundlesPrebuilt?: boolean;
  loglevel?: StorybookCliOptions['loglevel'];
}) {
  const config: StorybookCliOptions = {
    configDir,
    mode: site ? 'static' : 'dev',
    port: 9001,
    loglevel,
  };

  if (site) {
    config.outputDir = join(constants.ASSET_DIR, name);
    process.env.NODE_ENV = 'production';
  } else {
    // required for react refresh
    process.env.NODE_ENV = 'development';
  }

  const sharedBuild = sharedBundlesPrebuilt
    ? undefined
    : await runSharedBuild({
        repoRoot: REPO_ROOT,
        dist: site,
        watch: !site,
      });
  if (sharedBuild && !sharedBuild.success) {
    await sharedBuild.close?.();
    throw new Error(`Shared frontend build failed: ${sharedBuild.errors?.join(', ')}`);
  }

  try {
    // Some transitive deps of addon-docs are ESM and not loading properly
    // See: https://github.com/storybookjs/storybook/issues/29467
    require('fix-esm').require('react-docgen');
    await build(config);
  } finally {
    require('fix-esm').unregister();
    await sharedBuild?.close?.();
  }
}

export function runStorybookCli({ configDir, name }: { configDir: string; name: string }) {
  run(
    async ({ flags, log }) => {
      log.debug('Global config:\n', constants);

      await buildStorybook({
        configDir,
        name,
        site: Boolean(flags.site),
        sharedBundlesPrebuilt: Boolean(flags['shared-bundles-prebuilt']),
        loglevel: getLogLevelFromFlags(flags),
      });

      // Line is only reached when building the static version
      if (flags.site) process.exit();
    },
    {
      flags: {
        boolean: ['site', 'shared-bundles-prebuilt'],
      },
      description: `
        Run the storybook examples for ${name}
      `,
    }
  );
}
