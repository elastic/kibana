const path = require('path');
const pkg = require('../package.json');

require('@kbn/es').run({
  version: pkg.version,
  'source-path': path.resolve(__dirname, '../../elasticsearch'),
  'base-path': path.resolve(__dirname, '../.es')
});