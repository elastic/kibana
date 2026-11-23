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
import { parseArgs } from 'util';

// stylelint flags that consume the following argument as their value.
// `--fix` and `--suppress` are excluded because their value is optional.
const VALUE_FLAGS = {
  'cache-location': { type: 'string' },
  'cache-strategy': { type: 'string' },
  config: { type: 'string', short: 'c' },
  'config-basedir': { type: 'string' },
  'custom-formatter': { type: 'string' },
  'custom-syntax': { type: 'string' },
  formatter: { type: 'string', short: 'f' },
  'globby-options': { type: 'string' },
  go: { type: 'string' },
  'ignore-path': { type: 'string', short: 'i', multiple: true },
  'ignore-pattern': { type: 'string', multiple: true },
  ip: { type: 'string', multiple: true },
  'max-warnings': { type: 'string' },
  mw: { type: 'string' },
  'output-file': { type: 'string', short: 'o' },
  'stdin-filename': { type: 'string' },
  'suppress-location': { type: 'string' },
};

// Values stylelint accepts as the mode in `--fix <mode>` instead of treating them as inputs
const FIX_MODES = ['true', 'strict', 'lax'];

const isFixMode = (token, previousToken) =>
  previousToken?.kind === 'option' &&
  previousToken.name === 'fix' &&
  previousToken.value === undefined &&
  FIX_MODES.includes(token.value);

const args = process.argv.slice(2);
const { tokens } = parseArgs({
  args,
  options: VALUE_FLAGS,
  strict: false,
  allowPositionals: true,
  tokens: true,
});
const hasInput = tokens.some(
  (token, index) => token.kind === 'positional' && !isFixMode(token, tokens[index - 1])
);

const stylelintConfigPath = resolve(__dirname, '..', '..', '.stylelintrc');
const stylelintIgnorePath = resolve(__dirname, '..', '..', '.stylelintignore');
const { bin } = require('stylelint/package.json');
const stylelintExecutable = resolve(
  dirname(require.resolve('stylelint/package.json')),
  bin.stylelint
);

if (!hasInput) {
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
