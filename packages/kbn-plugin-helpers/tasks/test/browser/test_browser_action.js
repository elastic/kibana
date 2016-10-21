module.exports = function (plugin) {
  var execFileSync = require('child_process').execFileSync;

  var kbnServerArgs = [
    '--kbnServer.testsBundle.pluginId', plugin.id,
    '--kbnServer.plugin-path', plugin.root
  ];

  var cmd = 'npm';
  var args = ['run', 'test:dev', '--'].concat(kbnServerArgs);
  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: 'inherit'
  });

};
