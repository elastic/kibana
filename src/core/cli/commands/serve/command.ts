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

import { accessSync, constants as fsConstants } from 'fs';
import { resolve } from 'path';
import typeDetect from 'type-detect';
import { CommandModule, Options } from 'yargs';
import { getConfig } from '../../../../server/path';
import { fromRoot } from '../../../../utils/from_root';
import { handler } from './handler';

import { detectKibanaFeatures, KibanaFeatures } from '../../kibana_features';

const { R_OK } = fsConstants;

function resolvePath(path: string) {
  return resolve(process.cwd(), path);
}

const fileExists = (configPath: string): boolean => {
  try {
    accessSync(configPath, R_OK);
    return true;
  } catch (e) {
    return false;
  }
};

function ensureConfigExists(path: string) {
  if (!fileExists(path)) {
    throw new Error(`Config file [${path}] does not exist`);
  }
}

export function getServeCommandOptions(kibanaFeatures: KibanaFeatures) {
  const options: Array<[string, Options]> = [
    [
      'e',
      {
        alias: 'elasticsearch',
        description: 'Elasticsearch instance',
        requiresArg: true,
        type: 'string',
      },
    ],
    [
      'c',
      {
        alias: 'config',
        coerce: arg => (typeof arg === 'string' ? resolvePath(arg) : arg),
        default: [getConfig()],
        description:
          'Path to the config file, can be changed with the CONFIG_PATH environment variable as well. ' +
          'Use multiple --config args to include multiple config files.',
        requiresArg: true,
        type: 'array',
      },
    ],
    [
      'p',
      {
        alias: 'port',
        description: 'The port to bind Kibana to',
        requiresArg: true,
        type: 'number',
      },
    ],
    [
      'q',
      {
        alias: 'quiet',
        description: 'Prevent all logging except errors',
        type: 'boolean',
        conflicts: ['Q', 'verbose'],
      },
    ],
    [
      'Q',
      {
        alias: 'silent',
        description: 'Prevent all logging except errors',
        type: 'boolean',
        conflicts: 'verbose',
      },
    ],
    [
      'verbose',
      {
        description: 'Turns on verbose logging',
        type: 'boolean',
      },
    ],
    [
      'H',
      {
        alias: 'host',
        description: 'The host to bind to',
        requiresArg: true,
        type: 'string',
      },
    ],
    [
      'l',
      {
        alias: 'log-file',
        description: 'The file to log to',
        requiresArg: true,
        type: 'string',
      },
    ],
    [
      'plugin-dir',
      {
        alias: ['plugins'],
        coerce: arg => arg.map((path: string) => resolvePath(path)),
        default: [fromRoot('plugins'), fromRoot('src/core_plugins')],
        description:
          'A path to scan for plugins, this can be specified multiple ' +
          'times to specify multiple directories',
        requiresArg: true,
        type: 'array',
      },
    ],
    [
      'plugin-path',
      {
        coerce: arg => arg.map((path: string) => resolvePath(path)),
        description:
          'A path to a plugin which should be included by the server, ' +
          'this can be specified multiple times to specify multiple paths',
        type: 'array',
      },
    ],
  ];

  if (kibanaFeatures.isReplModeSupported) {
    options.push([
      'repl',
      {
        description: 'Run the server with a REPL prompt and access to the server object',
        type: 'boolean',
      },
    ]);
  }

  if (kibanaFeatures.isOssModeSupported) {
    options.push([
      'oss',
      {
        description: 'Start Kibana without X-Pack',
        type: 'boolean',
      },
    ]);
  }

  if (kibanaFeatures.isClusterModeSupported) {
    options.push(
      [
        'dev',
        {
          description: 'Run the server with development mode defaults',
          type: 'boolean',
        },
      ],
      [
        'ssl',
        {
          description: 'Run the dev server using HTTPS',
          type: 'boolean',
        },
      ],
      [
        'base-path',
        {
          description:
            'Put a proxy in front of the server in --dev mode, which adds a random basePath. Use --no-base-path to disable that behavior',
          type: 'boolean',
          default: true,
        },
      ],
      [
        'watch',
        {
          default: true,
          description:
            'Automatically restarts server in --dev mode. Use --no-watch to disable that behavior',
          type: 'boolean',
        },
      ]
    );
  }

  return options;
}

export function createServeCommand(): CommandModule {
  const kibanaFeatures = detectKibanaFeatures();

  return {
    builder: yargs => {
      for (const [name, value] of getServeCommandOptions(kibanaFeatures)) {
        yargs.option(name, value);
      }

      return yargs.check((argv: { [key: string]: any }) => {
        // Ensure config files exists,
        const configs: string[] = argv.config;
        for (const config of configs) {
          ensureConfigExists(config);
        }

        if (argv.dev) {
          try {
            const kbnDevConfig = fromRoot('config/kibana.dev.yml');
            if (fileExists(kbnDevConfig)) {
              argv.config.push(kbnDevConfig);
            }
          } catch (err) {
            // ignore, kibana.dev.yml does not exist
          }
        }

        if (argv.repl && !kibanaFeatures.isReplModeSupported) {
          throw new Error('[repl] Kibana REPL mode can only be run in development mode.');
        }

        if (argv.port !== undefined && isNaN(argv.port)) {
          throw new Error(`[port] must be a number, but got ${typeDetect(argv.port)}`);
        }

        return true;
      });
    },
    command: ['serve', '$0'],
    describe: 'Run the kibana server',
    handler: cliArgs => handler(cliArgs, kibanaFeatures),
  };
}
