var execFileSync = require('child_process').execFileSync;

module.exports = function testBrowserAction(plugin, run, options) {
  options = options || {};

  var kbnServerArgs = [
    '--kbnServer.plugin-path=' + plugin.root
  ];

  if (options.plugins) {
    kbnServerArgs.push('--kbnServer.testsBundle.pluginId=' + options.plugins);
  } else {
    kbnServerArgs.push('--kbnServer.testsBundle.pluginId=' + plugin.id);
  }

  var cmd = 'npm';
  var task = (options.dev) ? 'test:dev' : 'test:browser';
  var args = ['run', task, '--'].concat(kbnServerArgs);
  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2]
  });

};
