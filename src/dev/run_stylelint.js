/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';

const args = process.argv.slice(2);
const stylelintConfigPath = resolve(__dirname, '..', '..', '.stylelintrc');
const stylelintIgnorePath = resolve(__dirname, '..', '..', '.stylelintignore');
const { bin } = require('stylelint/package.json');
const stylelintExecutable = resolve(
  dirname(require.resolve('stylelint/package.json')),
  bin.stylelint
);

if (!args.length) {
  args.push('**/*.s+(a|c)ss');
}
args.push('--max-warnings', '0'); // return nonzero exit code on any warnings
args.push('--config', stylelintConfigPath); // configuration file
args.push('--ignore-path', stylelintIgnorePath); // ignore file

const { error, status } = spawnSync(process.execPath, [stylelintExecutable, ...args], {
  stdio: 'inherit',
});

if (error) {
  throw error;
}

process.exitCode = status ?? 1;
