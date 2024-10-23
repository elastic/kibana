/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { build } from '@storybook/core-server';
import { Flags, run } from '@kbn/dev-cli-runner';
import type { StorybookConfig } from '@storybook/react-webpack5';

// @ts-expect-error internal dep of storybook
import interpret from 'interpret'; // eslint-disable-line import/no-extraneous-dependencies
import * as constants from './constants';

// Convert the flags to a Storybook loglevel
function getLogLevelFromFlags(flags: Flags) {
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

export function runStorybookCli({ configDir, name }: { configDir: string; name: string }) {
  run(
    async ({ flags, log }) => {
      log.debug('Global config:\n', constants);

      const config: StorybookConfig = {
        configDir,
        mode: flags.site ? 'static' : 'dev',
        port: 9001,
        logLevel: getLogLevelFromFlags(flags),
      };
      if (flags.site) {
        config.outputDir = join(constants.ASSET_DIR, name);
      }

      // force storybook to use our transpilation rather than ts-node or anything else
      interpret.extensions['.ts'] = [require.resolve('@kbn/babel-register/install')];
      interpret.extensions['.tsx'] = [require.resolve('@kbn/babel-register/install')];
      interpret.extensions['.jsx'] = [require.resolve('@kbn/babel-register/install')];

      await build(config);

      // Line is only reached when building the static version
      if (flags.site) process.exit();
    },
    {
      flags: {
        boolean: ['site'],
      },
      description: `
        Run the storybook examples for ${name}
      `,
    }
  );
}
