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
import { Logger } from 'src/core/server/logging';
import { SavedObjectsMapping } from 'src/core/server/legacy/plugins/collect_legacy_ui_exports';
import { KibanaConfig } from 'src/core/server/kibana_config';
import { MappingProperties } from '../../mappings';
import { SavedObjectsSchema, SavedObjectsSchemaDefinition } from '../../schema';
import { RawSavedObjectDoc, SavedObjectsSerializer } from '../../serialization';
import { docValidator, PropertyValidators } from '../../validation';
import { buildActiveMappings, CallCluster, IndexMigrator } from '../core';
import {
  DocumentMigrator,
  VersionedTransformer,
  MigrationDefinition,
} from '../core/document_migrator';
import { createIndexMap } from '../core/build_index_map';
import { Config } from '../../../config';

interface KibanaMigratorOptions {
  callCluster: CallCluster;
  config: Config;
  kibanaConfig: KibanaConfig;
  kibanaVersion: string;
  logger: Logger;
  savedObjectMappings: SavedObjectsMapping[];
  savedObjectMigrations: MigrationDefinition;
  savedObjectSchemas: SavedObjectsSchemaDefinition;
  savedObjectValidations: PropertyValidators;
}

/**
 * Manages the shape of mappings and documents in the Kibana index.
 *
 * @export
 * @class KibanaMigrator
 */
export class KibanaMigrator {
  private callCluster: CallCluster;
  private config: Config;
  private documentMigrator: VersionedTransformer;
  private kibanaConfig: KibanaConfig;
  private log: Logger;
  private mappingProperties: MappingProperties;
  private readonly schema: SavedObjectsSchema;
  private serializer: SavedObjectsSerializer;

  /**
   * Creates an instance of KibanaMigrator.
   *
   */
  constructor({
    callCluster,
    kibanaConfig,
    config,
    kibanaVersion,
    logger,
    savedObjectMappings,
    savedObjectMigrations,
    savedObjectSchemas,
    savedObjectValidations,
  }: KibanaMigratorOptions) {
    this.callCluster = callCluster;
    this.kibanaConfig = kibanaConfig;
    this.config = config;
    this.schema = new SavedObjectsSchema(savedObjectSchemas);
    this.serializer = new SavedObjectsSerializer(this.schema);
    this.mappingProperties = mergeProperties(savedObjectMappings || []);
    this.log = logger;
    this.documentMigrator = new DocumentMigrator({
      kibanaVersion,
      migrations: savedObjectMigrations || {},
      validateDoc: docValidator(savedObjectValidations || {}),
      log: this.log,
    });
  }

  /**
   * Migrates the mappings and documents in the Kibana index. This will run only
   * once and subsequent calls will return the result of the original call.
   *
   * @returns
   * @memberof KibanaMigrator
   */
  public awaitMigration = once(async () => {
    const kibanaIndexName = this.kibanaConfig.index;
    const indexMap = createIndexMap({
      config: this.config,
      kibanaIndexName,
      indexMap: this.mappingProperties,
      schema: this.schema,
    });

    const migrators = Object.keys(indexMap).map(index => {
      return new IndexMigrator({
        batchSize: this.config.get('migrations.batchSize'),
        callCluster: this.callCluster, // server.plugins.elasticsearch!.getCluster('admin').callWithInternalUser,
        documentMigrator: this.documentMigrator,
        index,
        log: this.log,
        mappingProperties: indexMap[index].typeMappings,
        pollInterval: this.config.get('migrations.pollInterval'),
        scrollDuration: this.config.get('migrations.scrollDuration'),
        serializer: this.serializer,
        // Only necessary for the migrator of the kibana index.
        obsoleteIndexTemplatePattern:
          index === kibanaIndexName ? 'kibana_index_template*' : undefined,
        convertToAliasScript: indexMap[index].script,
      });
    });

    if (migrators.length === 0) {
      throw new Error(`Migrations failed to run, no mappings found or Kibana is not "ready".`);
    }

    return Promise.all(migrators.map(migrator => migrator.migrate()));
  });

  /**
   * Gets all the index mappings defined by Kibana's enabled plugins.
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
function mergeProperties(mappings: SavedObjectsMapping[]): MappingProperties {
  return mappings.reduce((acc, { pluginId, properties }) => {
    const duplicate = Object.keys(properties).find(k => acc.hasOwnProperty(k));
    if (duplicate) {
      throw new Error(`Plugin ${pluginId} is attempting to redefine mapping "${duplicate}".`);
    }
    return Object.assign(acc, properties);
  }, {});
}
