const execFileSync = require('child_process').execFileSync;
const  { join } = require('path');

module.exports = function (plugin, run, options) {
  options = options || {};

  const cmd = 'node';
  const script = join('scripts', 'kibana.js');
  let args = [script, '--dev', '--plugin-path', plugin.root];

  if (Array.isArray(plugin.includePlugins)) {
    plugin.includePlugins.forEach((path) => {
      args = args.concat(['--plugin-path', path]);
    });
  }

  if (options.flags) {
    args = args.concat(options.flags);
  }

  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2]
  });
};
