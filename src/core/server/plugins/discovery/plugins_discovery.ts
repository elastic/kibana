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
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { flatten } from 'lodash';

import { Type } from '@kbn/config-schema';
import { Env } from '../../config';
import { LoggerFactory, Logger } from '../../logging';
import { parseManifest } from './plugin_manifest_parser';
import { PluginDiscoveryError } from './plugin_discovery_error';
import { PluginManifest } from '../plugin';

const fsReaddirAsync = promisify(fs.readdir);
const fsStatAsync = promisify(fs.stat);

export interface PluginDefinition {
  path: string;
  manifest: PluginManifest;
  schema?: Type<unknown>;
}

export interface DiscoveredPluginsDefinitions {
  pluginDefinitions: ReadonlyArray<PluginDefinition>;
  errors: ReadonlyArray<PluginDiscoveryError>;
  searchPaths: ReadonlyArray<string>;
  devPluginPaths: ReadonlyArray<string>;
}

async function isDirExists(aPath: string) {
  try {
    return (await fsStatAsync(aPath)).isDirectory();
  } catch (e) {
    return false;
  }
}

function readSchemaMaybe(pluginPath: string, manifest: PluginManifest, log: Logger) {
  if (!manifest.server) return;
  const pluginPathServer = path.join(pluginPath, 'server');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pluginDefinition = require(pluginPathServer);

  if (!('configDefinition' in pluginDefinition)) {
    log.debug(`"${pluginPathServer}" does not export "configDefinition".`);
    return;
  }

  const configSchema: Type<unknown> | undefined = pluginDefinition.configDefinition.schema;
  if (configSchema && typeof configSchema.validate === 'function') {
    return configSchema;
  }

  throw PluginDiscoveryError.invalidConfigSchema(
    pluginPathServer,
    new Error(
      'The config definition for plugin did not contain "schema" field, which is required for config validation'
    )
  );
}

type PluginPathEither = string | PluginDiscoveryError;
const isPluginDiscoveryError = (candidate: PluginPathEither): candidate is PluginDiscoveryError =>
  candidate instanceof PluginDiscoveryError;

async function findSubFolders(folderPath: string): Promise<PluginPathEither[]> {
  const result = [];
  try {
    const subFolderNames = await fsReaddirAsync(folderPath);
    for (const name of subFolderNames) {
      const subFolderPath = path.join(folderPath, name);
      try {
        if (await isDirExists(subFolderPath)) {
          result.push(subFolderPath);
        }
      } catch (error) {
        result.push(PluginDiscoveryError.invalidSearchPath(subFolderPath, error));
      }
    }
  } catch (error) {
    result.push(PluginDiscoveryError.invalidSearchPath(folderPath, error));
  }
  return result;
}

/**
 * @internal
 * Iterates over every plugin search path, try to read plugin directories
 * to gather collection of plugin definitions.
 * If directory cannot be read the errors are accumulated in error collection.
 * Returns lists of plugin definitions & discovery errors.
 *
 * @param searchPaths - list of paths to plugin folders.
 * @param devPluginPaths - list of paths to plugins available on dev mode only.
 * @param env - Runtime environment configuration
 * @param logger - Logger factory
 */
export async function discover(
  searchPaths: ReadonlyArray<string>,
  devPluginPaths: ReadonlyArray<string>,
  env: Env,
  logger: LoggerFactory
): Promise<DiscoveredPluginsDefinitions> {
  const log = logger.get('discovery');
  if (devPluginPaths.length > 0) {
    log.warn(
      `Explicit plugin paths [${devPluginPaths}] are only supported in development. Relative imports will not work in production.`
    );
  }

  const pluginSearchPaths = await Promise.all(searchPaths.map(findSubFolders));
  const pluginFolderPaths = flatten<PluginPathEither>([...pluginSearchPaths, ...devPluginPaths]);

  const pluginDefinitions: PluginDefinition[] = [];
  const errors: PluginDiscoveryError[] = [];

  for (const pluginPath of pluginFolderPaths) {
    if (isPluginDiscoveryError(pluginPath)) {
      errors.push(pluginPath);
    } else {
      try {
        const manifest = await parseManifest(pluginPath, env.packageInfo);
        const schema = readSchemaMaybe(pluginPath, manifest, log);
        pluginDefinitions.push({
          path: pluginPath,
          manifest,
          schema,
        });
      } catch (error) {
        if (isPluginDiscoveryError(error)) {
          errors.push(error);
        } else {
          throw error;
        }
      }
    }
  }
  return Object.freeze({
    pluginDefinitions,
    errors,
    searchPaths,
    devPluginPaths,
  });
}
