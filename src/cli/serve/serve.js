import _ from 'lodash';
import { statSync, lstatSync, realpathSync } from 'fs';
import { isWorker } from 'cluster';
import { resolve } from 'path';

import { fromRoot } from '../../utils';
import { getConfig } from '../../server/path';
import { readYamlConfig } from './read_yaml_config';
import { readKeystore } from './read_keystore';

import { DEV_SSL_CERT_PATH, DEV_SSL_KEY_PATH } from '../dev_ssl';

function canRequire(path) {
  try {
    require.resolve(path);
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return false;
    } else {
      throw error;
    }
  }
}

function isSymlinkTo(link, dest) {
  try {
    const stat = lstatSync(link);
    return stat.isSymbolicLink() && realpathSync(link) === dest;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

const CLUSTER_MANAGER_PATH = resolve(__dirname, '../cluster/cluster_manager');
const CAN_CLUSTER = canRequire(CLUSTER_MANAGER_PATH);

// xpack is installed in both dev and the distributable, it's optional if
// install is a link to the source, not an actual install
const XPACK_INSTALLED_DIR = resolve(__dirname, '../../../node_modules/x-pack');
const XPACK_SOURCE_DIR = resolve(__dirname, '../../../x-pack');
const XPACK_INSTALLED = canRequire(XPACK_INSTALLED_DIR);
const XPACK_OPTIONAL = isSymlinkTo(XPACK_INSTALLED_DIR, XPACK_SOURCE_DIR);

const pathCollector = function () {
  const paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

const configPathCollector = pathCollector();
const pluginDirCollector = pathCollector();
const pluginPathCollector = pathCollector();

function readServerSettings(opts, extraCliOptions) {
  const settings = readYamlConfig(opts.config);
  const set = _.partial(_.set, settings);
  const get = _.partial(_.get, settings);
  const has = _.partial(_.has, settings);
  const merge = _.partial(_.merge, settings);

  if (opts.dev) {
    set('env', 'development');
    set('optimize.watch', true);

    if (!has('elasticsearch.username')) {
      set('elasticsearch.username', 'elastic');
    }

    if (!has('elasticsearch.password')) {
      set('elasticsearch.password', 'changeme');
    }

    if (opts.ssl) {
      set('server.ssl.enabled', true);
    }

    if (opts.ssl && !has('server.ssl.certificate') && !has('server.ssl.key')) {
      set('server.ssl.certificate', DEV_SSL_CERT_PATH);
      set('server.ssl.key', DEV_SSL_KEY_PATH);
    }
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

  set('plugins.paths', _.compact([].concat(
    get('plugins.paths'),
    opts.pluginPath,

    XPACK_INSTALLED && (!XPACK_OPTIONAL || !opts.oss)
      ? [XPACK_INSTALLED_DIR]
      : [],
  )));

  merge(readKeystore());
  merge(extraCliOptions);

  return settings;
}

export default function (program) {
  const command = program.command('serve');

  command
    .description('Run the kibana server')
    .collectUnknownOptions()
    .option('-e, --elasticsearch <uri>', 'Elasticsearch instance')
    .option(
      '-c, --config <path>',
      'Path to the config file, can be changed with the CONFIG_PATH environment variable as well. ' +
    'Use multiple --config args to include multiple config files.',
      configPathCollector,
      [ getConfig() ]
    )
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
        fromRoot('plugins'),
        fromRoot('src/core_plugins')
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

  if (XPACK_OPTIONAL) {
    command
      .option('--oss', 'Start Kibana without X-Pack');
  }

  if (CAN_CLUSTER) {
    command
      .option('--dev', 'Run the server with development mode defaults')
      .option('--ssl', 'Run the dev server using HTTPS')
      .option('--no-base-path', 'Don\'t put a proxy in front of the dev server, which adds a random basePath')
      .option('--no-watch', 'Prevents automatic restarts of the server in --dev mode');
  }

  command
    .action(async function (opts) {
      if (opts.dev) {
        try {
          const kbnDevConfig = fromRoot('config/kibana.dev.yml');
          if (statSync(kbnDevConfig).isFile()) {
            opts.config.push(kbnDevConfig);
          }
        } catch (err) {
        // ignore, kibana.dev.yml does not exist
        }
      }

      const getCurrentSettings = () => readServerSettings(opts, this.getUnknownOptions());
      const settings = getCurrentSettings();

      if (CAN_CLUSTER && opts.dev && !isWorker) {
        // stop processing the action and handoff to cluster manager
        const ClusterManager = require(CLUSTER_MANAGER_PATH);
        new ClusterManager(opts, settings);
        return;
      }

      let kbnServer = {};
      const KbnServer = require('../../server/kbn_server');
      try {
        kbnServer = new KbnServer(settings);
        await kbnServer.ready();
      } catch (error) {
        const { server } = kbnServer;

        switch (error.code) {
          case 'EADDRINUSE':
            logFatal(`Port ${error.port} is already in use. Another instance of Kibana may be running!`, server);
            break;

          case 'InvalidConfig':
            logFatal(error.message, server);
            break;

          default:
            logFatal(error, server);
            break;
        }

        kbnServer.close();
        const exitCode = error.processExitCode == null ? 1 : error.processExitCode;
        // eslint-disable-next-line no-process-exit
        process.exit(exitCode);
      }

      process.on('SIGHUP', function reloadConfig() {
        const settings = getCurrentSettings();
        kbnServer.server.log(['info', 'config'], 'Reloading logging configuration due to SIGHUP.');
        kbnServer.applyLoggingConfiguration(settings);
        kbnServer.server.log(['info', 'config'], 'Reloaded logging configuration due to SIGHUP.');
      });

      return kbnServer;
    });
}

function logFatal(message, server) {
  if (server) {
    server.log(['fatal'], message);
  }

  // It's possible for the Hapi logger to not be setup
  console.error('FATAL', message);
}
