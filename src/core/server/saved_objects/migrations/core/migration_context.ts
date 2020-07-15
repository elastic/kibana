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

/**
 * The MigrationOpts interface defines the minimum set of data required
 * in order to properly migrate an index. MigrationContext expands this
 * with computed values and values from the index being migrated, and is
 * serves as a central blueprint for what migrations will end up doing.
 */

import { Logger } from 'src/core/server/logging';
import { SavedObjectsSerializer } from '../../serialization';
import {
  SavedObjectsTypeMappingDefinitions,
  SavedObjectsMappingProperties,
  IndexMapping,
} from '../../mappings';
import { buildActiveMappings } from './build_active_mappings';
import { CallCluster } from './call_cluster';
import { VersionedTransformer } from './document_migrator';
import { fetchInfo, FullIndexInfo } from './elastic_index';
import { SavedObjectsMigrationLogger, MigrationLogger } from './migration_logger';

export interface MigrationOpts {
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
  callCluster: CallCluster;
  index: string;
  log: Logger;
  mappingProperties: SavedObjectsTypeMappingDefinitions;
  documentMigrator: VersionedTransformer;
  serializer: SavedObjectsSerializer;
  convertToAliasScript?: string;

  /**
   * If specified, templates matching the specified pattern will be removed
   * prior to running migrations. For example: 'kibana_index_template*'
   */
  obsoleteIndexTemplatePattern?: string;
}

export interface Context {
  callCluster: CallCluster;
  alias: string;
  source: FullIndexInfo;
  dest: FullIndexInfo;
  documentMigrator: VersionedTransformer;
  log: SavedObjectsMigrationLogger;
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
  serializer: SavedObjectsSerializer;
  obsoleteIndexTemplatePattern?: string;
  convertToAliasScript?: string;
}

/**
 * Builds up an uber object which has all of the config options, settings,
 * and various info needed to migrate the source index.
 */
export async function migrationContext(opts: MigrationOpts): Promise<Context> {
  const { log, callCluster } = opts;
  const alias = opts.index;
  const source = createSourceContext(await fetchInfo(callCluster, alias), alias);
  const dest = createDestContext(source, alias, opts.mappingProperties);

  return {
    callCluster,
    alias,
    source,
    dest,
    log: new MigrationLogger(log),
    batchSize: opts.batchSize,
    documentMigrator: opts.documentMigrator,
    pollInterval: opts.pollInterval,
    scrollDuration: opts.scrollDuration,
    serializer: opts.serializer,
    obsoleteIndexTemplatePattern: opts.obsoleteIndexTemplatePattern,
    convertToAliasScript: opts.convertToAliasScript,
  };
}

function createSourceContext(source: FullIndexInfo, alias: string) {
  if (source.exists && source.indexName === alias) {
    return {
      ...source,
      indexName: nextIndexName(alias, alias),
    };
  }

  return source;
}

function createDestContext(
  source: FullIndexInfo,
  alias: string,
  typeMappingDefinitions: SavedObjectsTypeMappingDefinitions
): FullIndexInfo {
  const targetMappings = disableUnknownTypeMappingFields(
    buildActiveMappings(typeMappingDefinitions),
    source.mappings
  );

  return {
    aliases: {},
    exists: false,
    indexName: nextIndexName(source.indexName, alias),
    mappings: targetMappings,
  };
}

/**
 * Merges the active mappings and the source mappings while disabling the
 * fields of any unknown Saved Object types present in the source index's
 * mappings.
 *
 * Since the Saved Objects index has `dynamic: strict` defined at the
 * top-level, only Saved Object types for which a mapping exists can be
 * inserted into the index. To ensure that we can continue to store Saved
 * Object documents belonging to a disabled plugin we define a mapping for all
 * the unknown Saved Object types that were present in the source index's
 * mappings. To limit the field count as much as possible, these unkwnown
 * type's mappings are set to `dynamic: false`.
 *
 * (Since we're using the source index mappings instead of looking at actual
 * document types in the inedx, we potentially add more "unknown types" than
 * what would be necessary to support migrating all the data over to the
 * target index.)
 *
 * @param activeMappings The mappings compiled from all the Saved Object types
 * known to this Kibana node.
 * @param sourceMappings The mappings of index used as the migration source.
 * @returns The mappings that should be applied to the target index.
 */
export function disableUnknownTypeMappingFields(
  activeMappings: IndexMapping,
  sourceMappings: IndexMapping
): IndexMapping {
  const targetTypes = Object.keys(activeMappings.properties);

  const disabledTypesProperties = Object.keys(sourceMappings.properties)
    .filter((sourceType) => {
      const isObjectType = 'properties' in sourceMappings.properties[sourceType];
      // Only Object/Nested datatypes can be excluded from the field count by
      // using `dynamic: false`.
      return !targetTypes.includes(sourceType) && isObjectType;
    })
    .reduce((disabledTypesAcc, sourceType) => {
      disabledTypesAcc[sourceType] = { dynamic: false, properties: {} };
      return disabledTypesAcc;
    }, {} as SavedObjectsMappingProperties);

  return {
    ...activeMappings,
    properties: {
      ...sourceMappings.properties,
      ...disabledTypesProperties,
      ...activeMappings.properties,
    },
  };
}

/**
 * Gets the next index name in a sequence, based on specified current index's info.
 * We're using a numeric counter to create new indices. So, `.kibana_1`, `.kibana_2`, etc
 * There are downsides to this, but it seemed like a simple enough approach.
 */
function nextIndexName(indexName: string, alias: string) {
  const indexSuffix = (indexName.match(/[\d]+$/) || [])[0];
  const indexNum = parseInt(indexSuffix, 10) || 0;
  return `${alias}_${indexNum + 1}`;
}
