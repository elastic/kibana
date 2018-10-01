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

import { SavedObjectsSchema } from '../../schema';
import { SavedObjectDoc, SavedObjectsSerializer } from '../../serialization';
import { docValidator } from '../../validation';

import {
  buildActiveMappings,
  CallCluster,
  createIndexMigrator,
  DocumentMigrator,
  IndexMigrator,
  LogFn,
  MappingProperties,
  VersionedTransformer,
} from '../core';
import { KbnServer, Server } from './kbn_server';

/**
 * Manages the shape of mappings and documents in the Kibana index.
 *
 * @export
 * @class KibanaMigrator
 */
export class KibanaMigrator {
  private kbnServer: KbnServer;
  private documentMigrator: VersionedTransformer;
  private mappingProperties: MappingProperties;
  private log: LogFn;
  private serializer: SavedObjectsSerializer;

  /**
   * Creates an instance of KibanaMigrator.
   *
   * @param opts
   * @prop {KbnServer} kbnServer - An instance of the Kibana server object.
   * @memberof KibanaMigrator
   */
  constructor({ kbnServer }: { kbnServer: KbnServer }) {
    this.kbnServer = kbnServer;
    this.serializer = new SavedObjectsSerializer(
      new SavedObjectsSchema(kbnServer.uiExports.savedObjectSchemas)
    );
    this.mappingProperties = mergeProperties(kbnServer.uiExports.savedObjectMappings || []);
    this.log = (meta: string[], message: string) => kbnServer.server.log(meta, message);
    this.documentMigrator = new DocumentMigrator({
      kibanaVersion: kbnServer.version,
      migrations: kbnServer.uiExports.savedObjectMigrations || {},
      validateDoc: docValidator(kbnServer.uiExports.savedObjectValidations || {}),
      log: this.log,
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
   * Creates an object that migrates the Kibana index.
   */
  public async createIndexMigrator(): Promise<IndexMigrator> {
    if (!migrationsEnabled(this.kbnServer)) {
      return {
        requiresMigration: false,
        migrate: async () => ({ status: 'skipped' }),
        fetchProgress: async () => 1,
      };
    }

    const { server } = this.kbnServer;
    const config = server.config();

    return createIndexMigrator({
      documentMigrator: this.documentMigrator,
      log: this.log,
      mappingProperties: this.mappingProperties,
      batchSize: config.get('migrations.batchSize'),
      callCluster: createCallCluster(server),
      index: config.get('kibana.index'),
      pollInterval: config.get('migrations.pollInterval'),
      scrollDuration: config.get('migrations.scrollDuration'),
      serializer: this.serializer,
    });
  }
}

function migrationsEnabled({ server }: KbnServer) {
  if (server.plugins.elasticsearch) {
    return true;
  }
  server.log(
    ['warning', 'migration'],
    'The elasticsearch plugin is disabled. Skipping migrations.'
  );
  return false;
}

/**
 * Wait until the elasticsearch plugin says it's ready, then return the
 * elasticsearch connection that will be used to run migrations.
 */
function createCallCluster(server: Server): any {
  let callCluster: CallCluster;
  return async (path: any, opts: any) => {
    if (!callCluster) {
      await server.plugins.elasticsearch!.waitUntilReady();
      callCluster = server.plugins.elasticsearch!.getCluster('admin').callWithInternalUser;
    }
    return await callCluster(path, opts);
  };
}

/**
 * Merges savedObjectMappings properties into a single object, verifying that
 * no mappings are redefined.
 */
function mergeProperties(mappings: any[]): MappingProperties {
  return mappings.reduce((acc, { pluginId, properties }) => {
    const duplicate = Object.keys(properties).find(k => acc.hasOwnProperty(k));
    if (duplicate) {
      throw new Error(`Plugin ${pluginId} is attempting to redefine mapping "${duplicate}".`);
    }
    return Object.assign(acc, properties);
  }, {});
}
