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
import { MappingProperties } from '../../../mappings';
import { SavedObjectsSchema, SavedObjectsSchemaDefinition } from '../../schema';
import { SavedObjectsManagementDefinition } from '../../management';
import { RawSavedObjectDoc, SavedObjectsSerializer } from '../../serialization';
import { docValidator } from '../../validation';
import { buildActiveMappings, CallCluster, IndexMigrator, LogFn } from '../core';
import { DocumentMigrator, VersionedTransformer } from '../core/document_migrator';

export interface KbnServer {
  server: Server;
  version: string;
  ready: () => Promise<any>;
  uiExports: {
    savedObjectMappings: any[];
    savedObjectMigrations: any;
    savedObjectValidations: any;
    savedObjectSchemas: SavedObjectsSchemaDefinition;
    savedObjectsManagement: SavedObjectsManagementDefinition;
  };
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

/**
 * Manages the shape of mappings and documents in the Kibana index.
 *
 * @export
 * @class KibanaMigrator
 */
export class KibanaMigrator {
  /**
   * Migrates the mappings and documents in the Kibana index. This will run only
   * once and subsequent calls will return the result of the original call.
   *
   * @returns
   * @memberof KibanaMigrator
   */
  public awaitMigration = once(async () => {
    const { server } = this.kbnServer;

    // Wait until the plugins have been found an initialized...
    await this.kbnServer.ready();

    // We can't do anything if the elasticsearch plugin has been disabled.
    if (!server.plugins.elasticsearch) {
      server.log(
        ['warning', 'migration'],
        'The elasticsearch plugin is disabled. Skipping migrations.'
      );
      return { status: 'skipped' };
    }

    // Wait until elasticsearch is green...
    await server.plugins.elasticsearch.waitUntilReady();

    const config = server.config();
    const migrator = new IndexMigrator({
      batchSize: config.get('migrations.batchSize'),
      callCluster: server.plugins.elasticsearch!.getCluster('admin').callWithInternalUser,
      documentMigrator: this.documentMigrator,
      index: config.get('kibana.index'),
      log: this.log,
      mappingProperties: this.mappingProperties,
      pollInterval: config.get('migrations.pollInterval'),
      scrollDuration: config.get('migrations.scrollDuration'),
      serializer: this.serializer,
      obsoleteIndexTemplatePattern: 'kibana_index_template*',
    });

    return migrator.migrate();
  });

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
   * @param {RawSavedObjectDoc} doc
   * @returns {RawSavedObjectDoc}
   * @memberof KibanaMigrator
   */
  public migrateDocument(doc: RawSavedObjectDoc): RawSavedObjectDoc {
    return this.documentMigrator.migrate(doc);
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
