module.exports = function (plugin) {
  var resolve = require('path').resolve;
  var execFileSync = require('child_process').execFileSync;

  var kibanaDir = resolve(plugin.root, '../kibana');

  var cmd = 'bin/kibana';
  var args = ['--dev', '--plugin-path', plugin.root];
  execFileSync(cmd, args, {
    cwd: kibanaDir,
    stdio: 'inherit'
  });
};
