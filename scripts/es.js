var resolve = require('path').resolve;
var pkg = require('../package.json');
var kbnEs = require('@kbn/es');

require('../src/setup_node_env');

kbnEs
  .run({
    license: 'basic',
    password: 'changeme',
    version: pkg.version,
    'source-path': resolve(__dirname, '../../elasticsearch'),
    'base-path': resolve(__dirname, '../.es'),
  })
  .catch(function (e) {
    console.error(e);
    process.exitCode = 1;
  });
