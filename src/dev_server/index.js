var _ = require('lodash');
var join = require('path').join;

var KbnServer = require('../server');

function run(grunt) {
  var opt = grunt ? _.bindKey(grunt, 'option') : _.noop;

  return (new KbnServer({
    'logging.quiet': opt('debug') && opt('verbose'),
    'kibana.server.port': opt('port') || 5601,
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
