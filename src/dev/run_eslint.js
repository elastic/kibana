/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';

import { eslintBinPath } from './eslint';

process.env.KIBANA_RESOLVER_HARD_CACHE = 'true';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(
    "This is a wrapper around ESLint's CLI that sets some defaults - see Eslint's help for flags:"
  );
  require(eslintBinPath); // eslint-disable-line import/no-dynamic-require
} else {
  run(
    ({ flags }) => {
      flags._ = flags._ || [];

      // verbose is only a flag for our CLI runner, not for ESLint
      if (process.argv.includes('--verbose')) {
        process.argv.splice(process.argv.indexOf('--verbose'), 1);
      } else {
        process.argv.push('--quiet');
      }

      if (flags.cache) {
        process.argv.push('--cache');
      }

      if (!flags._.ext) {
        process.argv.push('--ext', '.js,.mjs,.ts,.tsx');
      }

      // common-js is required so that logic before this executes before loading eslint
      // requiring the module is still going to pass along all flags
      require(eslintBinPath); // eslint-disable-line import/no-dynamic-require

      process.on('exit', (code) => {
        if (!code) {
          console.log('✅ no eslint errors found');
        }
      });
    },
    {
      description: 'Run ESLint on all JavaScript/TypeScript files in the repository',
      usage: 'node scripts/eslint.js [options] [<file>...]',
      flags: {
        allowUnexpected: true,
        boolean: ['cache', 'fix', 'quiet'],
        string: ['ext'],
      },
    }
  );
}
