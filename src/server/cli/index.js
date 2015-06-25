var _ = require('lodash');
var KbnServer = require('../../');
var program = require('commander');
var package = require('./utils/closestPackageJson').getSync();
var readYamlConfig = require('./readYamlConfig');

program.description('Kibana is an open source (Apache Licensed), browser based analytics and search dashboard for Elasticsearch.');
program.version(package.version);
program.option('-e, --elasticsearch <uri>', 'Elasticsearch instance');
program.option('-c, --config <path>', 'Path to the config file');
program.option('-p, --port <port>', 'The port to bind to', parseInt);
program.option('-q, --quiet', 'Turns off logging');
program.option('-H, --host <host>', 'The host to bind to');
program.option('-l, --log-file <path>', 'The file to log to');
program.option('--plugin-dir <path>', 'A path to scan for plugins, this can be specified multiple times to specify multiple directories');
program.option('--plugin-path <path>', 'A path to a plugin which should be included by the server, this can be specified multiple times to specify multiple paths');
program.option('--plguins <path>', 'an alias for --plugin-dir');
program.parse(process.argv);

var settings = _.defaults(readYamlConfig(program.config || process.env.CONFIG_PATH), {
  'logging.console.json': true
});

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

if (program.plugins || program.pluginDir) {
  settings['kibana.pluginScanDirs'] = [].concat(program.plugins, program.pluginDir).filter(Boolean);
}

if (program.pluginPath) {
  settings['kibana.pluginPaths'] = [].concat(program.pluginPath);
}

// Start the KbnServer server with the settings fromt he CLI and YAML file
var kibana = new KbnServer(settings);
kibana.listen().catch(function (err) {
  console.log(err.stack);
  process.exit(1);
});
