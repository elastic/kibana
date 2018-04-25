import { parse } from 'eslint/lib/options';

const options = parse(process.argv);
process.env.KIBANA_RESOLVER_HARD_CACHE = 'true';

if (!options._.length && !options.printConfig) {
  process.argv.push('.');
}

if (!process.argv.includes('--no-cache')) {
  process.argv.push('--cache');
}

// common-js is required so that logic before this executes before loading eslint
require('eslint/bin/eslint');
