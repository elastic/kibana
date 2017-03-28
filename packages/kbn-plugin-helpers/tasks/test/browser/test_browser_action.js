var execFileSync = require('child_process').execFileSync;
var winCmd = require('../../../lib/win_cmd');

module.exports = function testBrowserAction(plugin, run, options) {
  options = options || {};

  var kbnServerArgs = [
    '--kbnServer.plugin-path=' + plugin.root
  ];

  if (options.plugins) {
    kbnServerArgs.push('--kbnServer.tests_bundle.pluginId=' + options.plugins);
  } else {
    kbnServerArgs.push('--kbnServer.tests_bundle.pluginId=' + plugin.id);
  }

  var cmd = winCmd('npm');
  var task = (options.dev) ? 'test:dev' : 'test:browser';
  var args = ['run', task, '--'].concat(kbnServerArgs);
  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2]
  });

};
