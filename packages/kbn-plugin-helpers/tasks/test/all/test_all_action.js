module.exports = function testAllAction(plugin, run) {
  run('test/server')();
  run('test/browser')();
};
