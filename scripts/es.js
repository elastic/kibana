const path = require('path');
const pkg = require('../package.json');
const kbnEs = require('@kbn/es');

kbnEs
  .run({
    license: 'basic',
    password: 'changeme',
    version: pkg.version,
    'source-path': path.resolve(__dirname, '../../elasticsearch'),
    'base-path': path.resolve(__dirname, '../.es'),
  })
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  });
