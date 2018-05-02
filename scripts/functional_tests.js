require('../src/babel-register');
require('../packages/kbn-test').runTestsCli([
  'test/functional/config.js',
  'test/api_integration/config.js',
]);
