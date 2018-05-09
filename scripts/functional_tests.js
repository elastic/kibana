require('../src/babel-register');
require('../packages/kbn-test').runTestsCli([
  require.resolve('../test/functional/config.js'),
  require.resolve('../test/api_integration/config.js'),
]);
