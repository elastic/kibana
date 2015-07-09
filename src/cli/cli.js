'use strict';

let _ = require('lodash');
let KbnServer = require('../server/KbnServer');
let program = require('commander');
let fromRoot = require('../utils/fromRoot');
let pkg = require('../utils/closestPackageJson').getSync();
let readYamlConfig = require('./readYamlConfig');

program.description(
  'Kibana is an open source (Apache Licensed), browser based analytics ' +
  'and search dashboard for Elasticsearch.'
);
program.version(pkg.version);
program.option('-e, --elasticsearch <uri>', 'Elasticsearch instance');
program.option('-c, --config <path>', 'Path to the config file');
program.option('-p, --port <port>', 'The port to bind to', parseInt);
program.option('-q, --quiet', 'Turns off logging');
program.option('--verbose', 'Turns on verbose logging');
program.option('-H, --host <host>', 'The host to bind to');
program.option('-l, --log-file <path>', 'The file to log to');
program.option(
  '--plugin-dir <path>',
  'A path to scan for plugins, this can be specified multiple ' +
  'times to specify multiple directories'
);
program.option(
  '--plugin-path <path>',
  'A path to a plugin which should be included by the server, ' +
  'this can be specified multiple times to specify multiple paths'
);
program.option('--plugins <path>', 'an alias for --plugin-dir');
program.option('--dev', 'Run the server with development mode defaults');
program.option(
  '--watch',
  'Enable watching the source tree and automatically restarting, ' +
  'enabled by --dev, use --no-watch to disable'
);
program.parse(process.argv);

let settings = readYamlConfig(program.config || fromRoot('config/kibana.yml'));
let set = _.partial(_.set, settings);
let get = _.partial(_.get, settings);

if (program.dev) {
  set('env', 'development');
  set('optimize.watch', true);
}

if (program.watch != null) set('optimize.watch', program.watch);
if (program.elasticsearch) set('elasticsearch.url', program.elasticsearch);
if (program.port) set('server.port', program.port);
if (program.host) set('server.host', program.host);
if (program.quiet) set('logging.quiet', program.quiet);
if (program.logFile) set('logging.dest', program.logFile);

set('plugins.scanDirs', _.compact([].concat(
  get('plugins.scanDirs'),
  program.plugins,
  program.pluginDir,
  fromRoot('src/plugins')
)));

set('plugins.paths', [].concat(program.pluginPath || []));

// Start the KbnServer server with the settings fromt he CLI and YAML file
let kibana = new KbnServer(settings);
kibana.listen().catch(function (err) {
  console.log(err.stack);
  process.exit(1);
});
