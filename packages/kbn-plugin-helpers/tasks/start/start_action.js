module.exports = function (plugin, command) {
  var execFileSync = require('child_process').execFileSync;

  var cmd = (process.platform === 'win32') ? 'bin\\kibana.bat' : 'bin/kibana';
  var args = ['--dev', '--plugin-path', plugin.root, ...command.unkownOptions];
  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2]
  });
};
