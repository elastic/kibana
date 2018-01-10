import { resolve, dirname } from 'path';

import getopts from 'getopts';

const ROOT = dirname(require.resolve('../../package.json'));
const flags = getopts(process.argv.slice(2));

if (!flags.config) {
  process.argv.push('--config', resolve(ROOT, '.prettierrc'));
}

if (!flags.ignorePath) {
  process.argv.push('--ignore-path', resolve(ROOT, '.prettierignore'));
}

if (!flags._.length) {
  process.argv.push('./**/*.js');
}

if (!flags.write) {
  process.argv.push('--write');
}

// common-js is required so that logic before this executes before loading eslint
require('prettier/bin/prettier');
