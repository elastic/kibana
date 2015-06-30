var _ = require('lodash');
var join = require('path').join;

var KbnServer = require('../server/KbnServer');

function run(port, quiet) {
  return (new KbnServer({
    'logging.quiet': quiet,
    'kibana.server.port': port || 5601,
    'plugins.paths': [
      join(__dirname, 'dev_statics_plugin')
    ],
    'plugins.scanDirs': [
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
