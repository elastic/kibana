/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parse } from 'eslint/lib/options';

const options = parse(process.argv);
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
require('eslint/bin/eslint');
