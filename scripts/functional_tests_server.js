require('../src/setup_node_env');
require('../packages/kbn-test').startServersCli(
  require.resolve('../test/functional/config.js'),
);
