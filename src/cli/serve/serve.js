/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { statSync } from 'fs';
import { resolve } from 'path';
import url from 'url';

import { IS_KIBANA_DISTRIBUTABLE } from '../../legacy/utils';
import { fromRoot } from '../../core/server/utils';
import { getConfigPath } from '../../core/server/path';
import { bootstrap } from '../../core/server';
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

const CLUSTER_MANAGER_PATH = resolve(__dirname, '../cluster/cluster_manager');
const CAN_CLUSTER = canRequire(CLUSTER_MANAGER_PATH);

const REPL_PATH = resolve(__dirname, '../repl');
const CAN_REPL = canRequire(REPL_PATH);

// xpack is installed in both dev and the distributable, it's optional if
// install is a link to the source, not an actual install
const XPACK_DIR = resolve(__dirname, '../../../x-pack');
const XPACK_INSTALLED = canRequire(XPACK_DIR);

const pathCollector = function() {
  const paths = [];
  return function(path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

const configPathCollector = pathCollector();
const pluginDirCollector = pathCollector();
const pluginPathCollector = pathCollector();

function applyConfigOverrides(rawConfig, opts, extraCliOptions) {
  const set = _.partial(_.set, rawConfig);
  const get = _.partial(_.get, rawConfig);
  const has = _.partial(_.has, rawConfig);
  const merge = _.partial(_.merge, rawConfig);

  if (opts.oss) {
    delete rawConfig.xpack;
  }

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
      // @kbn/dev-utils is part of devDependencies
      const { CA_CERT_PATH } = require('@kbn/dev-utils');
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
      ensureNotDefined('elasticsearch.ssl.certificateAuthorities');

      const elasticsearchHosts = (
        (customElasticsearchHosts.length > 0 && customElasticsearchHosts) || [
          'https://localhost:9200',
        ]
      ).map(hostUrl => {
        const parsedUrl = url.parse(hostUrl);
        if (parsedUrl.hostname !== 'localhost') {
          throw new Error(
            `Hostname "${parsedUrl.hostname}" can't be used with --ssl. Must be "localhost" to work with certificates.`
          );
        }
        return `https://localhost:${parsedUrl.port}`;
      });

      set('server.ssl.enabled', true);
      set('server.ssl.certificate', DEV_SSL_CERT_PATH);
      set('server.ssl.key', DEV_SSL_KEY_PATH);
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

  if (opts.optimize) {
    set('server.autoListen', false);
    set('plugins.initialize', false);
  }

  set('plugins.scanDirs', _.compact([].concat(get('plugins.scanDirs'), opts.pluginDir)));
  set(
    'plugins.paths',
    _.compact(
      [].concat(
        get('plugins.paths'),
        opts.pluginPath,
        XPACK_INSTALLED && !opts.oss ? [XPACK_DIR] : []
      )
    )
  );

  merge(extraCliOptions);
  merge(readKeystore(get('path.data')));

  return rawConfig;
}

export default function(program) {
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
      [fromRoot('plugins'), fromRoot('src/legacy/core_plugins')]
    )
    .option(
      '--plugin-path <path>',
      'A path to a plugin which should be included by the server, ' +
        'this can be specified multiple times to specify multiple paths',
      pluginPathCollector,
      []
    )
    .option('--plugins <path>', 'an alias for --plugin-dir', pluginDirCollector)
    .option('--optimize', 'Optimize and then stop the server');

  if (CAN_REPL) {
    command.option('--repl', 'Run the server with a REPL prompt and access to the server object');
  }

  if (!IS_KIBANA_DISTRIBUTABLE) {
    command
      .option('--oss', 'Start Kibana without X-Pack')
      .option(
        '--run-examples',
        'Adds plugin paths for all the Kibana example plugins and runs with no base path'
      );
  }

  if (CAN_CLUSTER) {
    command
      .option('--dev', 'Run the server with development mode defaults')
      .option('--open', 'Open a browser window to the base url after the server is started')
      .option('--ssl', 'Run the dev server using HTTPS')
      .option(
        '--no-base-path',
        "Don't put a proxy in front of the dev server, which adds a random basePath"
      )
      .option('--no-watch', 'Prevents automatic restarts of the server in --dev mode')
      .option('--no-dev-config', 'Prevents loading the kibana.dev.yml file in --dev mode');
  }

  command.action(async function(opts) {
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
        open: !!opts.open,
        envName: unknownOptions.env ? unknownOptions.env.name : undefined,
        quiet: !!opts.quiet,
        silent: !!opts.silent,
        watch: !!opts.watch,
        repl: !!opts.repl,
        runExamples: !!opts.runExamples,
        // We want to run without base path when the `--run-examples` flag is given so that we can use local
        // links in other documentation sources, like "View this tutorial [here](http://localhost:5601/app/tutorial/xyz)".
        // We can tell users they only have to run with `yarn start --run-examples` to get those
        // local links to work.  Similar to what we do for "View in Console" links in our
        // elastic.co links.
        basePath: opts.runExamples ? false : !!opts.basePath,
        optimize: !!opts.optimize,
        oss: !!opts.oss,
      },
      features: {
        isClusterModeSupported: CAN_CLUSTER,
        isReplModeSupported: CAN_REPL,
      },
      applyConfigOverrides: rawConfig => applyConfigOverrides(rawConfig, opts, unknownOptions),
    });
  });
}
