module.exports = function testAllAction(plugin, run) {
  run('test/server').call(null);
  run('test/browser').call(null);
};
