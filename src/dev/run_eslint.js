import { parse } from 'eslint/lib/options';
import { DEFAULT_ESLINT_PATHS } from './eslint';

const options = parse(process.argv);

if (!options._.length && !options.printConfig) {
  process.argv.push(...DEFAULT_ESLINT_PATHS);
}

if (!process.argv.includes('--no-cache')) {
  process.argv.push('--cache');
}

// common-js is required so that logic before this executes before loading eslint
require('eslint/bin/eslint');
