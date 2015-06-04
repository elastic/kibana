#!/usr/bin/env node

var _ = require('lodash');
var Kibana = require('../');
var program = require('commander');
var path = require('path');
var writePidFile = require('../lib/write_pid_file');
var loadSettingsFromYAML = require('../lib/load_settings_from_yaml');
var settings = {};

var env = (process.env.NODE_ENV) ? process.env.NODE_ENV : 'development';
var packagePath = path.resolve(__dirname, '..', '..', '..', 'package.json');
if (env !== 'development') {
  packagePath = path.resolve(__dirname, '..', 'package.json');
}
var package = require(packagePath);

program.description('Kibana is an open source (Apache Licensed), browser based analytics and search dashboard for Elasticsearch.');
program.version(package.version);
program.option('-e, --elasticsearch <uri>', 'Elasticsearch instance');
program.option('-c, --config <path>', 'Path to the config file');
program.option('-p, --port <port>', 'The port to bind to', parseInt);
program.option('-q, --quiet', 'Turns off logging');
program.option('-H, --host <host>', 'The host to bind to');
program.option('-l, --log-file <path>', 'The file to log to');
program.option('--plugins <path>', 'Path to scan for plugins');
program.parse(process.argv);


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

if (program.config) {
  // Create the settings with the overrides from the YAML config file.
  settings = _.defaults(settings, loadSettingsFromYAML(program.config));
}


// Start the Kibana server with the settings fromt he CLI and YAML file
var kibana = new Kibana(settings);
kibana.listen()
.then(writePidFile)
.catch(function (err) {
  process.exit(1);
});
