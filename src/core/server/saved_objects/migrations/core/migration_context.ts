/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * The MigrationOpts interface defines the minimum set of data required
 * in order to properly migrate an index. MigrationContext expands this
 * with computed values and values from the index being migrated, and is
 * serves as a central blueprint for what migrations will end up doing.
 */

import { Logger } from '../../../logging';
import { MigrationEsClient } from './migration_es_client';
import { SavedObjectsSerializer } from '../../serialization';
import {
  SavedObjectsTypeMappingDefinitions,
  SavedObjectsMappingProperties,
  IndexMapping,
} from '../../mappings';
import { buildActiveMappings } from './build_active_mappings';
import { VersionedTransformer } from './document_migrator';
import * as Index from './elastic_index';
import { SavedObjectsMigrationLogger, MigrationLogger } from './migration_logger';

export interface MigrationOpts {
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
  client: MigrationEsClient;
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

/**
 * @internal
 */
export interface Context {
  client: MigrationEsClient;
  alias: string;
  source: Index.FullIndexInfo;
  dest: Index.FullIndexInfo;
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
  const { log, client } = opts;
  const alias = opts.index;
  const source = createSourceContext(await Index.fetchInfo(client, alias), alias);
  const dest = createDestContext(source, alias, opts.mappingProperties);

  return {
    client,
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

function createSourceContext(source: Index.FullIndexInfo, alias: string) {
  if (source.exists && source.indexName === alias) {
    return {
      ...source,
      indexName: nextIndexName(alias, alias),
    };
  }

  return source;
}

function createDestContext(
  source: Index.FullIndexInfo,
  alias: string,
  typeMappingDefinitions: SavedObjectsTypeMappingDefinitions
): Index.FullIndexInfo {
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
