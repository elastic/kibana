// # Run Jest tests
//
// All args will be forwarded directly to Jest, e.g. to watch tests run:
//
//     node scripts/jest --watch
//
// or to build code coverage:
//
//     node scripts/jest --coverage
//
// See all cli options in https://facebook.github.io/jest/docs/cli.html

require('../src/optimize/babel/register');
require('../src/jest/cli');

