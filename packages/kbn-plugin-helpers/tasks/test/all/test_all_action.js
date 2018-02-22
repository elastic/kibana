module.exports = function testAllAction(plugin, run) {
  run('testServer');
  run('testBrowser');
};
