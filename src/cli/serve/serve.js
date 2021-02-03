/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { set as lodashSet } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import { statSync } from 'fs';
import { resolve } from 'path';
import url from 'url';

import { getConfigPath } from '@kbn/utils';
import { IS_KIBANA_DISTRIBUTABLE } from '../../legacy/utils';
import { fromRoot } from '../../core/server/utils';
import { bootstrap } from '../../core/server';
import { readKeystore } from '../keystore/read_keystore';

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

const DEV_MODE_PATH = resolve(__dirname, '../../dev/cli_dev_mode');
const DEV_MODE_SUPPORTED = canRequire(DEV_MODE_PATH);

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

function applyConfigOverrides(rawConfig, opts, extraCliOptions) {
  const set = _.partial(lodashSet, rawConfig);
  const get = _.partial(_.get, rawConfig);
  const has = _.partial(_.has, rawConfig);
  const merge = _.partial(_.merge, rawConfig);

  if (opts.oss) {
    delete rawConfig.xpack;
  }

  if (opts.dev) {
    set('env', 'development');

    if (!has('elasticsearch.username')) {
      set('elasticsearch.username', 'kibana_system');
    }

    if (!has('elasticsearch.password')) {
      set('elasticsearch.password', 'changeme');
    }

    if (opts.ssl) {
      // @kbn/dev-utils is part of devDependencies
      const { CA_CERT_PATH, KBN_KEY_PATH, KBN_CERT_PATH } = require('@kbn/dev-utils');
      const customElasticsearchHosts = opts.elasticsearch
        ? opts.elasticsearch.split(',')
        : [].concat(get('elasticsearch.hosts') || []);

      function ensureNotDefined(path) {
        if (has(path)) {
          throw new Error(`Can't use --ssl when "${path}" configuration is already defined.`);
        }
      }
      ensureNotDefined('server.ssl.certificate');
      ensureNotDefined('server.ssl.key');
      ensureNotDefined('server.ssl.keystore.path');
      ensureNotDefined('server.ssl.truststore.path');
      ensureNotDefined('server.ssl.certificateAuthorities');
      ensureNotDefined('elasticsearch.ssl.certificateAuthorities');

      const elasticsearchHosts = (
        (customElasticsearchHosts.length > 0 && customElasticsearchHosts) || [
          'https://localhost:9200',
        ]
      ).map((hostUrl) => {
        const parsedUrl = url.parse(hostUrl);
        if (parsedUrl.hostname !== 'localhost') {
          throw new Error(
            `Hostname "${parsedUrl.hostname}" can't be used with --ssl. Must be "localhost" to work with certificates.`
          );
        }
        return `https://localhost:${parsedUrl.port}`;
      });

      set('server.ssl.enabled', true);
      set('server.ssl.certificate', KBN_CERT_PATH);
      set('server.ssl.key', KBN_KEY_PATH);
      set('server.ssl.certificateAuthorities', CA_CERT_PATH);
      set('elasticsearch.hosts', elasticsearchHosts);
      set('elasticsearch.ssl.certificateAuthorities', CA_CERT_PATH);
    }
  }

  if (opts.elasticsearch) set('elasticsearch.hosts', opts.elasticsearch.split(','));
  if (opts.port) set('server.port', opts.port);
  if (opts.host) set('server.host', opts.host);
  if (opts.quiet) set('logging.quiet', true);
  if (opts.silent) set('logging.silent', true);
  if (opts.verbose) set('logging.verbose', true);
  if (opts.logFile) set('logging.dest', opts.logFile);

  set('plugins.scanDirs', _.compact([].concat(get('plugins.scanDirs'), opts.pluginDir)));
  set('plugins.paths', _.compact([].concat(get('plugins.paths'), opts.pluginPath)));

  merge(extraCliOptions);
  merge(readKeystore());

  return rawConfig;
}

export default function (program) {
  const command = program.command('serve');

  command
    .description('Run the kibana server')
    .collectUnknownOptions()
    .option('-e, --elasticsearch <uri1,uri2>', 'Elasticsearch instances')
    .option(
      '-c, --config <path>',
      'Path to the config file, use multiple --config args to include multiple config files',
      configPathCollector,
      [getConfigPath()]
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
      [fromRoot('plugins')]
    )
    .option(
      '--plugin-path <path>',
      'A path to a plugin which should be included by the server, ' +
        'this can be specified multiple times to specify multiple paths',
      pluginPathCollector,
      []
    )
    .option('--plugins <path>', 'an alias for --plugin-dir', pluginDirCollector)
    .option('--optimize', 'Deprecated, running the optimizer is no longer required');

  if (!IS_KIBANA_DISTRIBUTABLE) {
    command
      .option('--oss', 'Start Kibana without X-Pack')
      .option(
        '--run-examples',
        'Adds plugin paths for all the Kibana example plugins and runs with no base path'
      );
  }

  if (DEV_MODE_SUPPORTED) {
    command
      .option('--dev', 'Run the server with development mode defaults')
      .option('--ssl', 'Run the dev server using HTTPS')
      .option('--dist', 'Use production assets from kbn/optimizer')
      .option(
        '--no-base-path',
        "Don't put a proxy in front of the dev server, which adds a random basePath"
      )
      .option('--no-watch', 'Prevents automatic restarts of the server in --dev mode')
      .option('--no-optimizer', 'Disable the kbn/optimizer completely')
      .option('--no-cache', 'Disable the kbn/optimizer cache')
      .option('--no-dev-config', 'Prevents loading the kibana.dev.yml file in --dev mode');
  }

  command.action(async function (opts) {
    if (opts.dev && opts.devConfig !== false) {
      try {
        const kbnDevConfig = fromRoot('config/kibana.dev.yml');
        if (statSync(kbnDevConfig).isFile()) {
          opts.config.push(kbnDevConfig);
        }
      } catch (err) {
        // ignore, kibana.dev.yml does not exist
      }
    }

    const unknownOptions = this.getUnknownOptions();
    await bootstrap({
      configs: [].concat(opts.config || []),
      cliArgs: {
        dev: !!opts.dev,
        envName: unknownOptions.env ? unknownOptions.env.name : undefined,
        quiet: !!opts.quiet,
        silent: !!opts.silent,
        watch: !!opts.watch,
        runExamples: !!opts.runExamples,
        // We want to run without base path when the `--run-examples` flag is given so that we can use local
        // links in other documentation sources, like "View this tutorial [here](http://localhost:5601/app/tutorial/xyz)".
        // We can tell users they only have to run with `yarn start --run-examples` to get those
        // local links to work.  Similar to what we do for "View in Console" links in our
        // elastic.co links.
        basePath: opts.runExamples ? false : !!opts.basePath,
        optimize: !!opts.optimize,
        disableOptimizer: !opts.optimizer,
        oss: !!opts.oss,
        cache: !!opts.cache,
        dist: !!opts.dist,
      },
      features: {
        isCliDevModeSupported: DEV_MODE_SUPPORTED,
      },
      applyConfigOverrides: (rawConfig) => applyConfigOverrides(rawConfig, opts, unknownOptions),
    });
  });
}
