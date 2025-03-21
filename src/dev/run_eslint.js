/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import yargs from 'yargs';
import fs from 'fs';
import path from 'path';

import { eslintBinPath } from './eslint';

process.env.KIBANA_RESOLVER_HARD_CACHE = 'true';

let quiet = true;
if (process.argv.includes('--no-quiet')) {
  quiet = false;
} else {
  process.argv.push('--quiet');
}

if (!(process.argv.includes('--help') || process.argv.includes('-h'))) {
  const options = yargs(process.argv).argv;
  if (!(options._.length || options.printConfig)) {
    process.argv.push('.');
  }
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
      fs.writeFileSync(
        path.join(process.env.MOON_PROJECT_ROOT, 'lint.log'),
        JSON.stringify(
          {
            argv: process.argv,
            target: process.env.MOON_TARGET,
          },
          null,
          2
        )
      );
    }
  });
}
