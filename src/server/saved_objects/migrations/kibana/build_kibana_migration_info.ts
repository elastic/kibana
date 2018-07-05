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

/*
 * This file contains logic to extract index mappings and migrations from Kibana's plugins.
*/

import { MappingProperties, MigrationDefinition } from '../core';
import { KibanaPlugin, KibanaPluginSpec } from './types';

export interface KbnServer {
  pluginSpecs: KibanaPlugin[];
}

interface Plugin extends KibanaPluginSpec {
  id: string;
}

interface Opts {
  kbnServer: KbnServer;
}

export interface MigrationInfo {
  mappings: MappingProperties;
  migrations: MigrationDefinition;
}

/**
 * Extracts mapping and migration information from the Kibana plugins.
 *
 * @export
 * @param {Opts} opts
 * @prop {KbnServer} kbnServer - The Kibana server
 * @returns {MigrationInfo}
 */
export function buildKibanaMigrationInfo(opts: Opts): MigrationInfo {
  const plugins = sanitizePlugins(opts.kbnServer.pluginSpecs);

  return {
    mappings: validateAndMerge(plugins, 'mappings'),
    migrations: validateAndMerge(plugins, 'migrations'),
  };
}

/**
 * Converts plugins into a compacted list of { id, mappings, migrations } objects,
 * which are easier to manipulate functionally.
 *
 * @param {KibanaPlugin[]} plugins
 * @returns {Plugin[]}
 */
function sanitizePlugins(plugins: KibanaPlugin[]): Plugin[] {
  return plugins.filter(p => !!p.getExportSpecs()).map(p => {
    const { mappings, migrations } = p.getExportSpecs()!;
    return {
      id: p.getId(),
      mappings,
      migrations,
    };
  });
}

/**
 * For each plugin, if it contains the specified property, merges the value of
 * the specified property into a single object. (e.g. merges all mappings or
 * all migrations into a single mapping or migration) and throws an error if
 * two plugins attempt to define the same property (e.g. the same mapping or
 * same migration type).
 *
 * @param {Plugin[]} plugins
 * @param {keyof Plugin} property
 * @returns
 */
function validateAndMerge(plugins: Plugin[], property: keyof Plugin) {
  return plugins.filter(p => !!p[property]).reduce((acc, plugin) => {
    assertNoDuplicateProperties(acc, plugin, property);
    return Object.assign(acc, plugin[property]);
  }, {});
}

function assertNoDuplicateProperties(
  dest: object,
  plugin: Plugin,
  property: keyof Plugin
) {
  const source = plugin[property] as any;
  const duplicate = Object.keys(dest).find(k => !!source[k]);
  if (duplicate) {
    throw new Error(
      `Plugin ${
        plugin.id
      } is attempting to redefine ${property} "${duplicate}".`
    );
  }
}
