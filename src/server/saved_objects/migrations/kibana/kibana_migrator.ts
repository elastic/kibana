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
import { SavedObjectsSchema, SavedObjectsSchemaDefinition } from '../../schema';
import { SavedObjectDoc, SavedObjectsSerializer } from '../../serialization';
import { docValidator } from '../../validation';
import {
  buildActiveMappings,
  CallCluster,
  IndexMigrator,
  LogFn,
  MappingProperties,
  MigrationResult,
} from '../core';
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
   * This returns an object, rather than a promise, because we have some code that
   * needs to await the migration result, and we have some code that simply needs
   * to quickly check whether or not the migration has completed, and then error.
   * The { isMigrated, awaitMigration } object allows for both scenarios.
   *
   * @returns
   * @memberof KibanaMigrator
   */
  public migrateIndex = once(() => {
    const promise = this.kbnServer.ready().then(() => this.performMigration());

    const status = {
      isMigrated: false,

      async awaitMigration() {
        const result = await promise;
        status.isMigrated = true;
        return result;
      },
    };

    return status;
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
   * @param {SavedObjectDoc} doc
   * @returns {SavedObjectDoc}
   * @memberof KibanaMigrator
   */
  public migrateDocument(doc: SavedObjectDoc): SavedObjectDoc {
    return this.documentMigrator.migrate(doc);
  }

  private async performMigration(): Promise<MigrationResult> {
    const { server } = this.kbnServer;

    // We can't do anything if the elasticsearch plugin has been disabled.
    if (!server.plugins.elasticsearch) {
      server.log(
        ['warning', 'migration'],
        'The elasticsearch plugin is disabled. Skipping migrations.'
      );
      return { status: 'skipped' };
    }

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
    });

    return migrator.migrate();
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
