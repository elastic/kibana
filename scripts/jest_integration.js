// # Run Jest integration tests
//
// All args will be forwarded directly to Jest, e.g. to watch tests run:
//
//     node scripts/jest_integration --watch
//
// or to build code coverage:
//
//     node scripts/jest_integration --coverage
//
// See all cli options in https://facebook.github.io/jest/docs/cli.html

const { resolve } = require('path');
process.argv.push('--config', resolve(__dirname, '../src/dev/jest/config.integration.js'));

require('../src/babel-register');
require('../src/dev/jest/cli');
