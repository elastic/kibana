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
 * This file contains the logic for managing the Kibana index version
 * (the shape of the mappings and documents in the index).
 */

import {
  buildActiveMappings,
  CallCluster,
  IndexMigrator,
  LogFn,
  MappingProperties,
  MigrationDefinition,
  SavedObjectDoc,
} from '../core';
import { DocumentMigrator, IDocumentMigrator } from '../core/document_migrator';

/***********************************************************************
 * Type definitions for the expected shape of KbnServer
 ***********************************************************************/

export interface KbnServer {
  pluginSpecs: KibanaPlugin[];
  server: Server;
  version: string;
}

interface KibanaPlugin {
  getId: (() => string);
  getExportSpecs: (() => KibanaPluginSpec | undefined);
}

interface KibanaPluginSpec {
  mappings?: MappingProperties;
  migrations?: MigrationDefinition;
}

interface Server {
  log: LogFn;
  config: () => {
    get: {
      (path: 'kibana.index' | 'migrations.scrollDuration'): string;
      (path: 'migrations.batchSize' | 'migrations.pollInterval'): number;
    };
  };
  plugins: { elasticsearch: ElasticsearchPlugin | undefined };
}

interface ElasticsearchPlugin {
  getCluster: ((name: 'admin') => { callWithInternalUser: CallCluster });
  waitUntilReady: () => Promise<any>;
}

interface SanitizedPlugin extends KibanaPluginSpec {
  id: string;
}

export function getActiveMappings({ kbnServer }: { kbnServer: KbnServer }) {
  return;
}

/**
 * Manages the shape of mappings and documents in the Kibana index.
 *
 * @export
 * @class KibanaMigrator
 */
export class KibanaMigrator {
  private kbnServer: KbnServer;
  private documentMigrator: IDocumentMigrator;
  private mappingProperties: MappingProperties;

  /**
   * Creates an instance of KibanaMigrator.
   *
   * @param opts
   * @prop {KbnServer} kbnServer - An instance of the Kibana server object.
   * @memberof KibanaMigrator
   */
  constructor({ kbnServer }: { kbnServer: KbnServer }) {
    const plugins = sanitizePlugins(kbnServer.pluginSpecs);
    this.kbnServer = kbnServer;
    this.mappingProperties = validateAndMerge(plugins, 'mappings');
    this.documentMigrator = new DocumentMigrator({
      kibanaVersion: kbnServer.version,
      migrations: validateAndMerge(plugins, 'migrations'),
    });
  }

  /**
   * Gets the index mappings defined by Kibana's enabled plugins.
   *
   * @returns
   * @memberof KibanaMigrator
   */
  public getActiveMappings() {
    return buildActiveMappings({ properties: this.mappingProperties });
  }

  /**
   * Migrates an individual doc to the latest version, as defined by the plugin migrations.
   *
   * @param {SavedObjectDoc} doc
   * @returns {SavedObjectDoc}
   * @memberof KibanaMigrator
   */
  public migrateDocument(doc: SavedObjectDoc): SavedObjectDoc {
    return this.documentMigrator.migrate(doc);
  }

  /**
   * Migrates the mappings and documents in the Kibana index.
   *
   * @returns
   * @memberof KibanaMigrator
   */
  public migrateIndex() {
    const { server } = this.kbnServer;
    const config = server.config();

    const migrator = new IndexMigrator({
      batchSize: config.get('migrations.batchSize'),
      callCluster: createCallCluster(server),
      documentMigrator: this.documentMigrator,
      index: config.get('kibana.index'),
      log: (meta: string[], message: string) => server.log(meta, message),
      mappingProperties: this.mappingProperties,
      pollInterval: config.get('migrations.pollInterval'),
      scrollDuration: config.get('migrations.scrollDuration'),
    });

    return migrator.migrate();
  }
}

/**
 * Wait until the elasticsearch plugin says it's ready, then return the
 * elasticsearch connection that will be used to run migrations.
 */
function createCallCluster(server: Server): any {
  let callCluster: CallCluster;
  return async (path: any, opts: any) => {
    if (!callCluster) {
      callCluster = await waitForElasticsearch(server);
    }
    return await callCluster(path, opts);
  };
}

async function waitForElasticsearch(server: Server) {
  if (!server.plugins.elasticsearch) {
    throw new Error(
      `Saved objects cannot initialize without the elasticsearch plugin.`
    );
  }
  await server.plugins.elasticsearch.waitUntilReady();
  return server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
}

/**
 * Converts plugins into a compacted list of { id, mappings, migrations } objects,
 * which are easier to manipulate functionally.
 *
 * @param {KibanaPlugin[]} plugins
 * @returns {SanitizedPlugin[]}
 */
function sanitizePlugins(plugins: KibanaPlugin[]): SanitizedPlugin[] {
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
 */
function validateAndMerge(
  plugins: SanitizedPlugin[],
  property: keyof SanitizedPlugin
) {
  return plugins.filter(p => !!p[property]).reduce((acc, plugin) => {
    assertNoDuplicateProperties(acc, plugin, property);

    return Object.assign(acc, plugin[property]);
  }, {});
}

function assertNoDuplicateProperties(
  dest: object,
  plugin: SanitizedPlugin,
  property: keyof SanitizedPlugin
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
