module.exports = function (program) {
  var _ = require('lodash');
  var path = require('path');
  var Kibana = require('../../');
  var writePidFile = require('../../lib/write_pid_file');
  var loadSettingsFromYAML = require('../../lib/load_settings_from_yaml');
  var settings = { 'logging.console.json': true };

  function parseSettings() {
    if (program.plugins) {
      settings['kibana.externalPluginsFolder'] = program.plugins;
    }

    if (program.elasticsearch) {
      settings['elasticsearch.url'] = program.elasticsearch;
    }

    if (program.port) {
      settings['kibana.server.port'] = program.port;
    }

    if (program.host) {
      settings['kibana.server.host'] = program.host;
    }

    if (program.quiet) {
      settings['logging.quiet'] = program.quiet;
    }

    if (program.logFile) {
      settings['logging.file'] = program.logFile;
    }

    var configPath = program.config || process.env.CONFIG_PATH;
    if (configPath) {
      settings = _.defaults(settings, loadSettingsFromYAML(configPath));
    }
  }

  parseSettings();

  // Start the Kibana server with the settings fromt he CLI and YAML file
  var kibana = new Kibana(settings);
  kibana.listen()
  .then(writePidFile)
  .catch(function (err) {
    process.exit(1);
  });
};