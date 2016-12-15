module.exports = function testBrowserAction(plugin, run, opts) {
  var execFileSync = require('child_process').execFileSync;
  opts = opts || {};

  var kbnServerArgs = [
    '--kbnServer.testsBundle.pluginId=' + plugin.id,
    '--kbnServer.plugin-path=' + plugin.root
  ];

  var cmd = 'npm';
  var task = (opts.runOnce) ? 'test:browser' : 'test:dev';
  var args = ['run', task, '--'].concat(kbnServerArgs);
  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2]
  });

};
