var execFileSync = require('child_process').execFileSync;

module.exports = function testBrowserAction(plugin, run, command) {
  command = command || {};

  var kbnServerArgs = [
    '--kbnServer.testsBundle.pluginId=' + plugin.id,
    '--kbnServer.plugin-path=' + plugin.root
  ];

  var cmd = 'npm';
  var task = (command.dev) ? 'test:dev' : 'test:browser';
  var args = ['run', task, '--'].concat(kbnServerArgs);
  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2]
  });

};
