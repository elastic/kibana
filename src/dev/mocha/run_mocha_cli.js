import { resolve } from 'path';

import getopts from 'getopts';
import globby from 'globby';

export function runMochaCli() {
  const opts = getopts(process.argv.slice(2), {
    alias: {
      t: 'timeout',
    },
    boolean: [
      'no-timeouts'
    ],
  });

  const runInBand = (
    process.execArgv.includes('--inspect') ||
    process.execArgv.includes('--inspect-brk')
  );

  // ensure that mocha exits when test have completed
  process.argv.push('--exit');

  // check that we aren't leaking any globals
  process.argv.push('--check-leaks');

  // ensure that mocha requires the babel-register script
  process.argv.push('--require', require.resolve('../../babel-register'));

  // set default test timeout
  if (opts.timeout == null && !opts['no-timeouts']) {
    if (runInBand) {
      process.argv.push('--no-timeouts');
    } else {
      process.argv.push('--timeout', '10000');
    }
  }

  // set default slow timeout
  if (opts.slow == null) {
    process.argv.push('--slow', '5000');
  }

  // set default reporter
  if (opts.reporter == null) {
    process.argv.push('--reporter', require.resolve('./server_junit_reporter'));
  }

  // set default test files
  if (!opts._.length) {
    globby.sync([
      'src/**/__tests__/**/*.js',
      'packages/kbn-datemath/test/**/*.js',
      'packages/kbn-dev-utils/src/**/__tests__/**/*.js',
      'tasks/**/__tests__/**/*.js',
    ], {
      cwd: resolve(__dirname, '../../..'),
      onlyFiles: true,
      absolute: true,
      ignore: [
        '**/__tests__/fixtures/**',
        'src/**/public/**',
        '**/_*.js'
      ]
    }).forEach(file => {
      process.argv.push(file);
    });
  }

  if (runInBand) {
    require('mocha/bin/_mocha');
  } else {
    require('mocha/bin/mocha');
  }
}
