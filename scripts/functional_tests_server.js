require('../src/babel-register');
require('../packages/kbn-test').startServersCli(
  require.resolve('../test/functional/config.js'),
);
