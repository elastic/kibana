let _ = require('lodash');
let { isWorker } = require('cluster');
let { resolve } = require('path');

let cwd = process.cwd();
let src = require('requirefrom')('src');
let fromRoot = src('utils/fromRoot');

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
  program
  .command('serve')
  .description('Run the kibana server')
  .collectUnknownOptions()
  .option('-e, --elasticsearch <uri>', 'Elasticsearch instance')
  .option('-c, --config <path>', 'Path to the config file')
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
  .option('--plugins <path>', 'an alias for --plugin-dir', pluginDirCollector)
  .option('--dev', 'Run the server with development mode defaults')
  .option('--no-watch', 'Prevent watching, use with --dev to prevent server restarts')
  .option('--no-lazy', 'Prevent lazy optimization of applications, only works with --dev')
  .action(function (opts) {
    if (opts.dev && !isWorker) {
      // stop processing the action and handoff to cluster manager
      let ClusterManager = require('../cluster/ClusterManager');
      new ClusterManager(opts);
      return;
    }

    let readYamlConfig = require('./readYamlConfig');
    let KbnServer = src('server/KbnServer');

    let settings = readYamlConfig(opts.config || fromRoot('config/kibana.yml'));
    let set = _.partial(_.set, settings);
    let get = _.partial(_.get, settings);

    if (opts.dev) {
      set('env', 'development');
      set('optimize.lazy', opts.lazy);
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

    let server = new KbnServer(_.merge(settings, this.getUnknownOptions()));

    server.ready().catch(function (err) {
      console.error(err.stack);
      process.exit(1); // eslint-disable-line no-process-exit
    });

    return server;
  });
};
