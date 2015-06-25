var _ = require('lodash');
var join = require('path').join;

var KbnServer = require('../server');

function run(port, quiet) {
  return (new KbnServer({
    'logging.quiet': quiet,
    'kibana.server.port': port || 5601,
    'kibana.pluginPaths': [
      join(__dirname, 'dev_statics_plugin')
    ],
    'kibana.pluginScanDirs': [
      join(__dirname, '..', 'plugins')
    ]
  }))
  .listen();
}

if (require.main === module) {
  run().done();
} else {
  module.exports = run;
}
