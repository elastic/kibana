var run = require('../../../lib/run');

module.exports = function testAllAction(plugin) {
  run('test/server').call(null);
  run('test/browser').call(null, { runOnce: true });
};
