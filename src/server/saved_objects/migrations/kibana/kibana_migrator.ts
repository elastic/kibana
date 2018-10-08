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

import { once } from 'lodash';
import { SavedObjectsSchema } from '../../schema';
import { SavedObjectDoc, SavedObjectsSerializer } from '../../serialization';
import { docValidator } from '../../validation';
import {
  buildActiveMappings,
  createIndexMigrator,
  IndexMigrator,
  LogFn,
  MappingProperties,
} from '../core';
import { DocumentMigrator, VersionedTransformer } from '../core/document_migrator';
import { KbnServer } from './kbn_server';

/**
 * Manages the shape of mappings and documents in the Kibana index.
 *
 * @export
 * @class KibanaMigrator
 */
export class KibanaMigrator {
  /**
   * Migrates the mappings and documents in the Kibana index. It's important that this only runs
   * once, and subsequent calls return the value of the original call, so that various parts of
   * the codebase can call await without serious / negative consequences.
   *
   * @returns
   * @memberof KibanaMigrator
   */
  public awaitMigration = once(() => this.getIndexMigrator().then(migrator => migrator.migrate()));

  private getIndexMigrator = once(
    async (): Promise<IndexMigrator> => {
      const { server } = this.kbnServer;

      await this.kbnServer.ready();

      // We can't do anything if the elasticsearch plugin has been disabled...
      if (!server.plugins.elasticsearch) {
        server.log(
          ['warning', 'migration'],
          'The elasticsearch plugin is disabled. Skipping migrations.'
        );
        return {
          fetchProgress: async () => 1,
          migrate: async () => ({ status: 'skipped' }),
        };
      }

      await server.plugins.elasticsearch.waitUntilReady();

      const config = server.config();
      return createIndexMigrator({
        batchSize: config.get('migrations.batchSize'),
        callCluster: server.plugins.elasticsearch!.getCluster('admin').callWithInternalUser,
        documentMigrator: this.documentMigrator,
        index: config.get('kibana.index'),
        log: this.log,
        mappingProperties: this.mappingProperties,
        pollInterval: config.get('migrations.pollInterval'),
        scrollDuration: config.get('migrations.scrollDuration'),
        serializer: this.serializer,
      });
    }
  );

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
   * Fetches the progress of the Kibana index migration.
   */
  public fetchMigrationProgress() {
    return this.getIndexMigrator()
      .then(migrator => migrator.fetchProgress())
      .catch(() => 0);
  }
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
