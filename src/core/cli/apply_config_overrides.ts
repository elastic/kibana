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

import { Config } from '../server/config';
import * as args from './args';
import { DEV_SSL_CERT_PATH, DEV_SSL_KEY_PATH } from './dev_ssl';
import { KibanaFeatures, XPACK_INSTALLED_PATH } from './kibana_features';
import { readKeystore } from './read_keystore';

/**
 * Applies overrides to the config values supplied through command line and keystore.
 *
 * @param config `RawConfig` instance to update config values for.
 * @param argv Argv object with key/value pairs.
 * @param kibanaFeatures Features that are supported by current installation.
 */
export function applyConfigOverrides(
  config: Config,
  argv: { [key: string]: any },
  kibanaFeatures: KibanaFeatures
) {
  const configOverrides = [
    ...getServerConfigOverrides(argv),
    ...getDevConfigOverrides(argv),
    ...getLoggingConfigOverrides(argv),
    ...getPluginsConfigOverrides(config, argv, kibanaFeatures),
    ...getUnknownArgsOverrides(argv, kibanaFeatures),
    ...getKeystoreOverrides(config),
  ];

  for (const [key, value] of configOverrides) {
    config.set(key, value);
  }

  return config;
}

function* getServerConfigOverrides(argv: { [key: string]: any }) {
  if (argv.port != null) {
    yield [['server', 'port'], argv.port];
  }

  if (argv.host != null) {
    yield [['server', 'host'], argv.host];
  }

  if (argv.elasticsearch != null) {
    yield [['elasticsearch', 'url'], argv.elasticsearch];
  }
}

function* getDevConfigOverrides(argv: { [key: string]: any }) {
  if (!argv.dev) {
    return;
  }

  yield ['env', 'development'];
  yield [['optimize', 'watch'], true];

  if (argv['elasticsearch.username'] == null) {
    yield [['elasticsearch', 'username'], 'elastic'];
  }

  if (argv['elasticsearch.password'] == null) {
    yield [['elasticsearch', 'password'], 'changeme'];
  }

  if (argv.ssl) {
    yield [['server', 'ssl', 'enabled'], true];

    if (argv['server.ssl.certificate'] == null && argv['server.ssl.key'] == null) {
      yield [['server', 'certificate', 'enabled'], DEV_SSL_CERT_PATH];
      yield [['server', 'ssl', 'key'], DEV_SSL_KEY_PATH];
    }
  }
}

function* getLoggingConfigOverrides(argv: { [key: string]: any }) {
  if (argv.quiet != null) {
    yield [['logging', 'quiet'], argv.quiet];
  }

  if (argv.silent != null) {
    yield [['logging', 'silent'], argv.silent];
  }

  if (argv.verbose != null) {
    yield [['logging', 'verbose'], argv.verbose];
  }

  if (argv.logFile != null) {
    yield [['logging', 'dest'], argv.logFile];
  }
}

function* getPluginsConfigOverrides(
  config: Config,
  argv: { [key: string]: any },
  kibanaFeatures: KibanaFeatures
) {
  yield [
    ['plugins', 'scanDirs'],
    [...new Set([].concat(config.get(['plugins', 'scanDirs']), argv.pluginDir).filter(Boolean))],
  ];

  const xPackPluginPaths: string[] =
    kibanaFeatures.isXPackInstalled && (!kibanaFeatures.isOssModeSupported || !argv.oss)
      ? [XPACK_INSTALLED_PATH]
      : [];

  yield [
    ['plugins', 'paths'],
    [
      ...new Set(
        xPackPluginPaths.concat(config.get(['plugins', 'paths']), argv.pluginPath).filter(Boolean)
      ),
    ],
  ];
}

function* getUnknownArgsOverrides(argv: { [key: string]: any }, kibanaFeatures: KibanaFeatures) {
  // Merge unknown CLI args into config.
  for (const unknownArgKey of args.getUnknownOptions(argv, kibanaFeatures)) {
    try {
      yield [unknownArgKey, JSON.parse(argv[unknownArgKey])];
    } catch (e) {
      yield [unknownArgKey, argv[unknownArgKey]];
    }
  }
}

function* getKeystoreOverrides(config: Config) {
  yield* Object.entries(readKeystore(config.get(['path', 'data'])));
}
