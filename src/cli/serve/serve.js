let _ = require('lodash');
let { isWorker } = require('cluster');
let { resolve } = require('path');

let cwd = process.cwd();
let src = require('requirefrom')('src');
let fromRoot = src('utils/fromRoot');
const getConfig = require('../../server/path').getConfig;

let canCluster;
try {
  require.resolve('../cluster/ClusterManager');
  canCluster = true;
} catch (e) {
  canCluster = false;
}

let pathCollector = function () {
  let paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

let pluginDirCollector = pathCollector();
let pluginPathCollector = pathCollector();

module.exports = function (program) {
  let command = program.command('serve');

  command
  .description('Run the kibana server')
  .collectUnknownOptions()
  .option('-e, --elasticsearch <uri>', 'Elasticsearch instance')
  .option(
    '-c, --config <path>',
    'Path to the config file, can be changed with the CONFIG_PATH environment variable as well',
    getConfig())
  .option('-p, --port <port>', 'The port to bind to', parseInt)
  .option('-q, --quiet', 'Prevent all logging except errors')
  .option('-Q, --silent', 'Prevent all logging')
  .option('--verbose', 'Turns on verbose logging')
  .option('-H, --host <host>', 'The host to bind to')
  .option('-l, --log-file <path>', 'The file to log to')
  .option(
    '--plugin-dir <path>',
    'A path to scan for plugins, this can be specified multiple ' +
    'times to specify multiple directories',
    pluginDirCollector,
    [
      fromRoot('installedPlugins'),
      fromRoot('src/plugins')
    ]
  )
  .option(
    '--plugin-path <path>',
    'A path to a plugin which should be included by the server, ' +
    'this can be specified multiple times to specify multiple paths',
    pluginPathCollector,
    []
  )
  .option('--plugins <path>', 'an alias for --plugin-dir', pluginDirCollector);

  if (canCluster) {
    command
    .option('--dev', 'Run the server with development mode defaults')
    .option('--no-watch', 'Prevents automatic restarts of the server in --dev mode');
  }

  command
  .action(async function (opts) {
    if (canCluster && opts.dev && !isWorker) {
      // stop processing the action and handoff to cluster manager
      let ClusterManager = require('../cluster/ClusterManager');
      new ClusterManager(opts);
      return;
    }

    let readYamlConfig = require('./read_yaml_config');
    let KbnServer = src('server/KbnServer');

    let settings = readYamlConfig(opts.config);

    if (opts.dev) {
      try { _.merge(settings, readYamlConfig(fromRoot('config/kibana.dev.yml'))); }
      catch (e) { null; }
    }

    let set = _.partial(_.set, settings);
    let get = _.partial(_.get, settings);

    if (opts.dev) {
      set('env', 'development');
      set('optimize.lazy', true);
    }

    if (opts.elasticsearch) set('elasticsearch.url', opts.elasticsearch);
    if (opts.port) set('server.port', opts.port);
    if (opts.host) set('server.host', opts.host);
    if (opts.quiet) set('logging.quiet', true);
    if (opts.silent) set('logging.silent', true);
    if (opts.verbose) set('logging.verbose', true);
    if (opts.logFile) set('logging.dest', opts.logFile);

    set('plugins.scanDirs', _.compact([].concat(
      get('plugins.scanDirs'),
      opts.pluginDir
    )));

    set('plugins.paths', [].concat(opts.pluginPath || []));

    let kbnServer = {};

    try {
      kbnServer = new KbnServer(_.merge(settings, this.getUnknownOptions()));
      await kbnServer.ready();
    }
    catch (err) {
      let { server } = kbnServer;

      if (server) server.log(['fatal'], err);
      console.error('FATAL', err);

      kbnServer.close();
      process.exit(1); // eslint-disable-line no-process-exit
    }

    return kbnServer;
  });
};
