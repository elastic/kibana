/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import yargs from 'yargs';

import { eslintBinPath } from './eslint';

let quiet = true;
if (process.argv.includes('--no-quiet')) {
  quiet = false;
} else {
  process.argv.push('--quiet');
}

const options = yargs(process.argv).argv;
process.env.KIBANA_RESOLVER_HARD_CACHE = 'true';

if (!options._.length && !options.printConfig) {
  process.argv.push('.');
}

if (!process.argv.includes('--no-cache')) {
  process.argv.push('--cache');
}

if (!process.argv.includes('--ext')) {
  process.argv.push('--ext', '.js,.mjs,.ts,.tsx');
}

// common-js is required so that logic before this executes before loading eslint
require(eslintBinPath); // eslint-disable-line import/no-dynamic-require

if (quiet) {
  process.on('exit', (code) => {
    if (!code) {
      console.log('✅ no eslint errors found');
    }
  });
}
