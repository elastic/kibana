const execFileSync = require('child_process').execFileSync;
const winCmd = require('../../../lib/win_cmd');

module.exports = function testBrowserAction(plugin, run, options) {
  options = options || {};

  const kbnServerArgs = [
    '--kbnServer.plugin-path=' + plugin.root
  ];

  if (options.plugins) {
    kbnServerArgs.push('--kbnServer.tests_bundle.pluginId=' + options.plugins);
  } else {
    kbnServerArgs.push('--kbnServer.tests_bundle.pluginId=' + plugin.id);
  }

  const task = (options.dev) ? 'test:dev' : 'test:browser';
  const args = [task].concat(kbnServerArgs);
  execFileSync(winCmd('yarn'), args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2]
  });

};
