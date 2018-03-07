const path = require('path');
const pkg = require('../package.json');
const getopts = require('getopts');

const sourcePath = path.resolve(__dirname, '../../elasticsearch');
const argv = process.argv.slice(2);
const options = getopts(argv);

// sets defaults for use in Kibana
const defaults = [];

if (!options.version) {
  defaults.push('--version', pkg.version);
}

if (!options['source-path']) {
  defaults.push('--source-path', sourcePath);
}

if (!options['base-path']) {
  defaults.push('--base-path', path.resolve(__dirname, '../.es'));
}

require('@kbn/es').run(argv.concat(defaults));