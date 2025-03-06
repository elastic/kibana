/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set as lodashSet } from '@kbn/safer-lodash-set';
import _ from 'lodash';
import { resolve } from 'path';
import url from 'url';

import { isKibanaDistributable } from '@kbn/repo-info';
import { readKeystore } from '../keystore/read_keystore';
import { compileConfigStack } from './compile_config_stack';
import { getConfigFromFiles } from '@kbn/config';

const DEV_MODE_PATH = '@kbn/cli-dev-mode';
const DEV_MODE_SUPPORTED = canRequire(DEV_MODE_PATH);
const MOCK_IDP_PLUGIN_PATH = '@kbn/mock-idp-plugin/common';
const MOCK_IDP_PLUGIN_SUPPORTED = canRequire(MOCK_IDP_PLUGIN_PATH);

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

const getBootstrapScript = (isDev) => {
  if (DEV_MODE_SUPPORTED && isDev && process.env.isDevCliChild !== 'true') {
    // need dynamic require to exclude it from production build
    // eslint-disable-next-line import/no-dynamic-require
    const { bootstrapDevMode } = require(DEV_MODE_PATH);
    return bootstrapDevMode;
  } else {
    const { bootstrap } = require('@kbn/core/server');
    return bootstrap;
  }
};

const setServerlessKibanaDevServiceAccountIfPossible = (get, set, opts) => {
  const esHosts = [].concat(
    get('elasticsearch.hosts', []),
    opts.elasticsearch ? opts.elasticsearch.split(',') : []
  );

  /*
   * We only handle the service token if serverless ES is running locally.
   * Example would be if the user is running SES in the cloud and KBN serverless
   * locally, they would be expected to handle auth on their own and this token
   * is likely invalid anyways.
   */
  const isESlocalhost = esHosts.length
    ? esHosts.some((hostUrl) => {
        const parsedUrl = url.parse(hostUrl);
        return (
          parsedUrl.hostname === 'localhost' ||
          parsedUrl.hostname === '127.0.0.1' ||
          parsedUrl.hostname === 'host.docker.internal'
        );
      })
    : true; // default is localhost:9200

  if (!opts.dev || !opts.serverless || !isESlocalhost) {
    return;
  }

  const DEV_UTILS_PATH = '@kbn/dev-utils';

  if (!canRequire(DEV_UTILS_PATH)) {
    return;
  }

  // need dynamic require to exclude it from production build
  // eslint-disable-next-line import/no-dynamic-require
  const { kibanaDevServiceAccount } = require(DEV_UTILS_PATH);
  set('elasticsearch.serviceAccountToken', kibanaDevServiceAccount.token);
};

function pathCollector() {
  const paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
}

const configPathCollector = pathCollector();
const pluginPathCollector = pathCollector();

export function applyConfigOverrides(rawConfig, opts, extraCliOptions, keystoreConfig) {
  const set = _.partial(lodashSet, rawConfig);
  const get = _.partial(_.get, rawConfig);
  const has = _.partial(_.has, rawConfig);

  function ensureNotDefined(path, command = '--ssl') {
    if (has(path)) {
      throw new Error(`Can't use ${command} when "${path}" configuration is already defined.`);
    }
  }

  if (opts.oss) {
    delete rawConfig.xpack;
  }

  // only used to set cliArgs.envName, we don't want to inject that into the config
  delete extraCliOptions.env;

  let isServerlessSamlSupported = false;
  if (opts.dev) {
    if (opts.serverless) {
      setServerlessKibanaDevServiceAccountIfPossible(get, set, opts);
      isServerlessSamlSupported = tryConfigureServerlessSamlProvider(
        rawConfig,
        opts,
        extraCliOptions
      );
    }

    set('server.prototypeHardening', true);

    if (!has('elasticsearch.serviceAccountToken') && opts.devCredentials !== false) {
      if (!has('elasticsearch.username')) {
        set('elasticsearch.username', 'kibana_system');
      }

      if (!has('elasticsearch.password')) {
        set('elasticsearch.password', 'changeme');
      }
    }

    if (opts.http2) {
      set('server.protocol', 'http2');
    }

    // HTTP TLS configuration
    if (opts.ssl || opts.http2) {
      // @kbn/dev-utils is part of devDependencies
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { CA_CERT_PATH, KBN_KEY_PATH, KBN_CERT_PATH } = require('@kbn/dev-utils');

      ensureNotDefined('server.ssl.certificate');
      ensureNotDefined('server.ssl.key');
      ensureNotDefined('server.ssl.keystore.path');
      ensureNotDefined('server.ssl.truststore.path');
      ensureNotDefined('server.ssl.certificateAuthorities');

      set('server.ssl.enabled', true);
      set('server.ssl.certificate', KBN_CERT_PATH);
      set('server.ssl.key', KBN_KEY_PATH);
      set('server.ssl.certificateAuthorities', CA_CERT_PATH);
    }
  }

  // Kib/ES encryption
  if (opts.ssl || isServerlessSamlSupported) {
    // @kbn/dev-utils is part of devDependencies
    // eslint-disable-next-line import/no-extraneous-dependencies
    const { CA_CERT_PATH } = require('@kbn/dev-utils');

    const customElasticsearchHosts = opts.elasticsearch
      ? opts.elasticsearch.split(',')
      : [].concat(get('elasticsearch.hosts') || []);

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

    set('elasticsearch.hosts', elasticsearchHosts);
    set('elasticsearch.ssl.certificateAuthorities', CA_CERT_PATH);
  }

  if (opts.elasticsearch) set('elasticsearch.hosts', opts.elasticsearch.split(','));
  if (opts.port) set('server.port', opts.port);
  if (opts.host) set('server.host', opts.host);

  if (opts.silent) {
    set('logging.root.level', 'off');
  }
  if (opts.verbose) {
    set('logging.root.level', 'all');
  }

  set('plugins.paths', _.compact([].concat(get('plugins.paths'), opts.pluginPath)));

  _.mergeWith(rawConfig, extraCliOptions, mergeAndReplaceArrays);
  _.merge(rawConfig, keystoreConfig);

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
      []
    )
    .option('-p, --port <port>', 'The port to bind to', parseInt)
    .option('-Q, --silent', 'Set the root logger level to off')
    .option('--verbose', 'Set the root logger level to all')
    .option('-H, --host <host>', 'The host to bind to')
    .option(
      '-l, --log-file <path>',
      'Deprecated, set logging file destination in your configuration'
    )
    .option(
      '--plugin-path <path>',
      'A path to a plugin which should be included by the server, ' +
        'this can be specified multiple times to specify multiple paths',
      pluginPathCollector,
      []
    )
    .option('--optimize', 'Deprecated, running the optimizer is no longer required');

  if (!isKibanaDistributable()) {
    command
      .option('--oss', 'Start Kibana without X-Pack')
      .option(
        '--run-examples',
        'Adds plugin paths for all the Kibana example plugins and runs with no base path'
      )
      .option(
        '--serverless [oblt|security|es]',
        'Start Kibana in a specific serverless project mode. ' +
          'If no mode is provided, it starts Kibana in the most recent serverless project mode (default is es)'
      );
  }

  if (DEV_MODE_SUPPORTED) {
    command
      .option('--dev', 'Run the server with development mode defaults')
      .option('--ssl', 'Run the dev server using HTTPS')
      .option('--no-ssl', 'Run the server without HTTPS')
      .option('--http2', 'Run the dev server using HTTP2 with TLS')
      .option('--dist', 'Use production assets from kbn/optimizer')
      .option(
        '--no-base-path',
        "Don't put a proxy in front of the dev server, which adds a random basePath"
      )
      .option('--no-watch', 'Prevents automatic restarts of the server in --dev mode')
      .option('--no-optimizer', 'Disable the kbn/optimizer completely')
      .option('--no-cache', 'Disable the kbn/optimizer cache')
      .option('--no-dev-config', 'Prevents loading the kibana.dev.yml file in --dev mode')
      .option(
        '--no-dev-credentials',
        'Prevents setting default values for `elasticsearch.username` and `elasticsearch.password` in --dev mode'
      );
  }

  command.action(async function (opts) {
    const unknownOptions = this.getUnknownOptions();
    const configs = compileConfigStack({
      configOverrides: opts.config,
      devConfig: opts.devConfig,
      dev: opts.dev,
      serverless: opts.serverless || unknownOptions.serverless,
    });

    const configsEvaluated = getConfigFromFiles(configs);
    const isServerlessMode = !!(
      configsEvaluated.serverless ||
      opts.serverless ||
      unknownOptions.serverless
    );

    const isServerlessSamlSupported = isServerlessMode && opts.ssl !== false;
    const cliArgs = {
      dev: !!opts.dev,
      envName: unknownOptions.env ? unknownOptions.env.name : undefined,
      silent: !!opts.silent,
      verbose: !!opts.verbose,
      watch: !!opts.watch,
      runExamples: !!opts.runExamples,
      // We want to run without base path when the `--run-examples` flag is given so that we can use local
      // links in other documentation sources, like "View this tutorial [here](http://localhost:5601/app/tutorial/xyz)".
      // We can tell users they only have to run with `yarn start --run-examples` to get those
      // local links to work.  Similar to what we do for "View in Console" links in our
      // elastic.co links.
      // We also want to run without base path when running in serverless mode so that Elasticsearch can
      // connect to Kibana's mock identity provider.
      basePath: opts.runExamples || isServerlessSamlSupported ? false : !!opts.basePath,
      optimize: !!opts.optimize,
      disableOptimizer: !opts.optimizer,
      oss: !!opts.oss,
      cache: !!opts.cache,
      dist: !!opts.dist,
      serverless: isServerlessMode,
    };

    // In development mode, the main process uses the @kbn/dev-cli-mode
    // bootstrap script instead of core's. The DevCliMode instance
    // is in charge of starting up the optimizer, and spawning another
    // `/script/kibana` process with the `isDevCliChild` varenv set to true.
    // This variable is then used to identify that we're the 'real'
    // Kibana server process, and will be using core's bootstrap script
    // to effectively start Kibana.
    const bootstrapScript = getBootstrapScript(cliArgs.dev);
    const keystoreConfig = await readKeystore();
    await bootstrapScript({
      configs,
      cliArgs,
      applyConfigOverrides: (rawConfig) =>
        applyConfigOverrides(rawConfig, opts, unknownOptions, keystoreConfig),
    });
  });
}

function mergeAndReplaceArrays(objValue, srcValue) {
  if (typeof srcValue === 'undefined') {
    return objValue;
  } else if (Array.isArray(srcValue)) {
    // do not merge arrays, use new value instead
    return srcValue;
  } else {
    // default to default merging
    return undefined;
  }
}

/**
 * Tries to configure SAML provider in serverless mode and applies the necessary configuration.
 * @param rawConfig Full configuration object.
 * @param opts CLI options.
 * @param extraCliOptions Extra CLI options.
 * @returns {boolean} True if SAML provider was successfully configured.
 */
function tryConfigureServerlessSamlProvider(rawConfig, opts, extraCliOptions) {
  if (!MOCK_IDP_PLUGIN_SUPPORTED || opts.ssl === false) {
    return false;
  }

  // Ensure the plugin is loaded in dynamically to exclude from production build
  // eslint-disable-next-line import/no-dynamic-require
  const { MOCK_IDP_REALM_NAME } = require(MOCK_IDP_PLUGIN_PATH);

  // Check if there are any custom authentication providers already configured with the order `0` reserved for the
  // Serverless SAML provider or if there is an existing SAML provider with the name MOCK_IDP_REALM_NAME. We check
  // both rawConfig and extraCliOptions because the latter can be used to override the former.
  let hasBasicOrTokenProviderConfigured = false;
  for (const configSource of [rawConfig, extraCliOptions]) {
    const providersConfig = _.get(configSource, 'xpack.security.authc.providers', {});
    for (const [providerType, providers] of Object.entries(providersConfig)) {
      if (providerType === 'basic' || providerType === 'token') {
        hasBasicOrTokenProviderConfigured = true;
      }

      for (const [providerName, provider] of Object.entries(providers)) {
        if (provider.order === 0) {
          console.warn(
            `The serverless SAML authentication provider won't be configured because the order "0" is already used by the custom authentication provider "${providerType}/${providerName}".` +
              `Please update the custom provider to use a different order or remove it to allow the serverless SAML provider to be configured.`
          );
          return false;
        }

        if (providerType === 'saml' && providerName === MOCK_IDP_REALM_NAME) {
          console.warn(
            `The serverless SAML authentication provider won't be configured because the SAML provider with "${MOCK_IDP_REALM_NAME}" name is already configured".`
          );
          return false;
        }
      }
    }
  }

  if (_.has(rawConfig, 'server.basePath')) {
    console.warn(
      `Custom base path is not supported when running in Serverless, it will be removed.`
    );
    _.unset(rawConfig, 'server.basePath');
  }

  if (opts.ssl) {
    console.info(
      'Kibana is being served over HTTPS. Make sure to adjust the `--kibanaUrl` parameter while running the local Serverless ES cluster.'
    );
  }

  // Make SAML provider the first in the provider chain
  lodashSet(rawConfig, `xpack.security.authc.providers.saml.${MOCK_IDP_REALM_NAME}`, {
    order: 0,
    realm: MOCK_IDP_REALM_NAME,
    icon: 'user',
    description: 'Continue as Test User',
    hint: 'Allows testing serverless user roles',
  });

  // Disable login selector to automatically trigger SAML authentication, unless it's explicitly enabled.
  if (!_.has(rawConfig, 'xpack.security.authc.selector.enabled')) {
    lodashSet(rawConfig, 'xpack.security.authc.selector.enabled', false);
  }

  // Since we explicitly configured SAML authentication provider, default Basic provider won't be automatically
  // configured, and we have to do it manually instead unless other Basic or Token provider was already configured.
  if (!hasBasicOrTokenProviderConfigured) {
    lodashSet(rawConfig, 'xpack.security.authc.providers.basic.basic', {
      order: Number.MAX_SAFE_INTEGER,
    });
  }

  return true;
}
