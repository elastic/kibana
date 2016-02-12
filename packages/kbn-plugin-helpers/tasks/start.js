module.exports = function () {
  var resolve = require('path').resolve;
  var execFileSync = require('child_process').execFileSync;

  var pluginDir = resolve(__dirname, '../');
  var kibanaDir = resolve(pluginDir, '../kibana');

  var cmd = 'bin/kibana';
  var args = ['--dev', '--plugin-path', pluginDir];
  execFileSync(cmd, args, {
    cwd: kibanaDir,
    stdio: 'inherit'
  });
};
