/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { buildCLI } from 'stylelint/lib/cli';

const options = buildCLI(process.argv.slice(2));

const stylelintConfigPath = resolve(__dirname, '..', '..', '.stylelintrc');
const stylelintIgnorePath = resolve(__dirname, '..', '..', '.stylelintignore');

if (!options.input.length) {
  process.argv.push('**/*.s+(a|c)ss');
}
process.argv.push('--max-warnings', '0'); // return nonzero exit code on any warnings
process.argv.push('--config', stylelintConfigPath); // configuration file
process.argv.push('--ignore-path', stylelintIgnorePath); // ignore file

// common-js is required so that logic before this executes before loading sass-lint
require('stylelint/bin/stylelint');
