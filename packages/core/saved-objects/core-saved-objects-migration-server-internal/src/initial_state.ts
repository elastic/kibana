/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Option from 'fp-ts/Option';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import {
  getLatestMappingsVirtualVersionMap,
  IndexMapping,
  IndexTypesMap,
  SavedObjectsMigrationConfigType,
} from '@kbn/core-saved-objects-base-server-internal';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import {
  getOutdatedDocumentsQuery,
  type OutdatedDocumentsQueryParams,
} from './get_outdated_documents_query';
import type { InitState } from './state';
import { excludeUnusedTypesQuery } from './core';
import { getTempIndexName } from './model/helpers';

export interface CreateInitialStateParams extends OutdatedDocumentsQueryParams {
  kibanaVersion: string;
  waitForMigrationCompletion: boolean;
  mustRelocateDocuments: boolean;
  indexTypes: string[];
  indexTypesMap: IndexTypesMap;
  hashToVersionMap: Record<string, string>;
  targetIndexMappings: IndexMapping;
  preMigrationScript?: string;
  indexPrefix: string;
  migrationsConfig: SavedObjectsMigrationConfigType;
  typeRegistry: ISavedObjectTypeRegistry;
  docLinks: DocLinksServiceStart;
  logger: Logger;
  esCapabilities: ElasticsearchCapabilities;
}

const TEMP_INDEX_MAPPINGS: IndexMapping = {
  dynamic: false,
  properties: {
    type: { type: 'keyword' },
    typeMigrationVersion: {
      type: 'version',
    },
  },
};

/**
 * Construct the initial state for the model
 */
export const createInitialState = ({
  kibanaVersion,
  waitForMigrationCompletion,
  mustRelocateDocuments,
  indexTypes,
  indexTypesMap,
  hashToVersionMap,
  targetIndexMappings,
  preMigrationScript,
  coreMigrationVersionPerType,
  migrationVersionPerType,
  indexPrefix,
  migrationsConfig,
  typeRegistry,
  docLinks,
  logger,
  esCapabilities,
}: CreateInitialStateParams): InitState => {
  const outdatedDocumentsQuery = getOutdatedDocumentsQuery({
    coreMigrationVersionPerType,
    migrationVersionPerType,
  });

  const knownTypes = typeRegistry.getAllTypes().map((type) => type.name);
  const excludeFilterHooks = Object.fromEntries(
    typeRegistry
      .getAllTypes()
      .filter((type) => !!type.excludeOnUpgrade)
      .map((type) => [type.name, type.excludeOnUpgrade!])
  );
  // short key to access savedObjects entries directly from docLinks
  const migrationDocLinks = docLinks.links.kibanaUpgradeSavedObjects;

  if (
    migrationsConfig.discardUnknownObjects &&
    migrationsConfig.discardUnknownObjects !== kibanaVersion
  ) {
    logger.warn(
      'The flag `migrations.discardUnknownObjects` is defined but does not match the current kibana version; unknown objects will NOT be discarded.'
    );
  }

  if (
    migrationsConfig.discardCorruptObjects &&
    migrationsConfig.discardCorruptObjects !== kibanaVersion
  ) {
    logger.warn(
      'The flag `migrations.discardCorruptObjects` is defined but does not match the current kibana version; corrupt objects will NOT be discarded.'
    );
  }

  return {
    controlState: 'INIT',
    waitForMigrationCompletion,
    mustRelocateDocuments,
    indexTypes,
    indexTypesMap,
    hashToVersionMap,
    indexPrefix,
    legacyIndex: indexPrefix,
    currentAlias: indexPrefix,
    versionAlias: `${indexPrefix}_${kibanaVersion}`,
    versionIndex: `${indexPrefix}_${kibanaVersion}_001`,
    tempIndex: getTempIndexName(indexPrefix, kibanaVersion),
    tempIndexAlias: getTempIndexName(indexPrefix, kibanaVersion) + '_alias',
    kibanaVersion,
    preMigrationScript: Option.fromNullable(preMigrationScript),
    targetIndexMappings,
    tempIndexMappings: TEMP_INDEX_MAPPINGS,
    outdatedDocumentsQuery,
    retryCount: 0,
    retryDelay: 0,
    retryAttempts: migrationsConfig.retryAttempts,
    batchSize: migrationsConfig.batchSize,
    maxBatchSize: migrationsConfig.batchSize,
    maxBatchSizeBytes: migrationsConfig.maxBatchSizeBytes.getValueInBytes(),
    maxReadBatchSizeBytes: migrationsConfig.maxReadBatchSizeBytes.getValueInBytes(),
    discardUnknownObjects: migrationsConfig.discardUnknownObjects === kibanaVersion,
    discardCorruptObjects: migrationsConfig.discardCorruptObjects === kibanaVersion,
    logs: [],
    excludeOnUpgradeQuery: excludeUnusedTypesQuery,
    knownTypes,
    latestMappingsVersions: getLatestMappingsVirtualVersionMap(typeRegistry.getAllTypes()),
    excludeFromUpgradeFilterHooks: excludeFilterHooks,
    migrationDocLinks,
    esCapabilities,
  };
};
