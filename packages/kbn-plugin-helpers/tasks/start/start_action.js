var execFileSync = require('child_process').execFileSync;

module.exports = function (plugin, run, options) {
  options = options || {};

  var cmd = (process.platform === 'win32') ? 'bin\\kibana.bat' : 'bin/kibana';
  var args = ['--dev', '--plugin-path', plugin.root];

  if (options.flags) {
    args = args.concat(options.flags);
  }

  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2]
  });
};
