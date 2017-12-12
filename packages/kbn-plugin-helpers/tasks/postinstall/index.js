const resolve = require('path').resolve;
const statSync = require('fs').statSync;

module.exports = function (plugin) {
  if (
    fileExists(resolve(plugin.root, '../kibana/package.json')) &&
    !fileExists(resolve(plugin.root, '../../kibana/package.json'))
  ) {
    process.stdout.write(
      '\nWARNING: Kibana now requires that plugins must be located in ' +
      '`../kibana-extra/{pluginName}` relative to the Kibana folder ' +
      'during development. We found a Kibana in `../kibana`, but not in ' +
      '`../../kibana`.\n'
    );
  }
};

function fileExists(path) {
  try {
    const stat = statSync(path);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}
