/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  SavedObjectsMigrationConfigType,
} from '@kbn/core-saved-objects-base-server-internal';
import { getLatestMappingsVirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import {
  getOutdatedDocumentsQuery,
  type OutdatedDocumentsQueryParams,
} from './get_outdated_documents_query';
import type { InitState } from './state';
import { buildExcludeUnusedTypesQuery } from './core';

export interface CreateInitialStateParams extends OutdatedDocumentsQueryParams {
  kibanaVersion: string;
  waitForMigrationCompletion: boolean;
  indexTypes: string[];
  hashToVersionMap: Record<string, string>;
  targetIndexMappings: IndexMapping;
  indexPrefix: string;
  migrationsConfig: SavedObjectsMigrationConfigType;
  typeRegistry: ISavedObjectTypeRegistry;
  docLinks: DocLinksServiceStart;
  logger: Logger;
  esCapabilities: ElasticsearchCapabilities;
}

/**
 * Construct the initial state for the model
 */
export const createInitialState = ({
  kibanaVersion,
  waitForMigrationCompletion,
  indexTypes,
  hashToVersionMap,
  targetIndexMappings,
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
    indexTypes,
    hashToVersionMap,
    indexPrefix,
    currentAlias: indexPrefix,
    versionAlias: `${indexPrefix}_${kibanaVersion}`,
    versionIndex: `${indexPrefix}_${kibanaVersion}_001`,
    kibanaVersion,
    targetIndexMappings,
    outdatedDocumentsQuery,
    retryCount: 0,
    skipRetryReset: false,
    retryDelay: 0,
    retryAttempts: migrationsConfig.retryAttempts,
    batchSize: migrationsConfig.batchSize,
    maxBatchSize: migrationsConfig.batchSize,
    maxBatchSizeBytes: migrationsConfig.maxBatchSizeBytes.getValueInBytes(),
    maxReadBatchSizeBytes: migrationsConfig.maxReadBatchSizeBytes.getValueInBytes(),
    discardUnknownObjects: migrationsConfig.discardUnknownObjects === kibanaVersion,
    discardCorruptObjects: migrationsConfig.discardCorruptObjects === kibanaVersion,
    logs: [],
    excludeOnUpgradeQuery: buildExcludeUnusedTypesQuery(typeRegistry.getLegacyTypes()),
    knownTypes,
    latestMappingsVersions: getLatestMappingsVirtualVersionMap(typeRegistry.getAllTypes()),
    excludeFromUpgradeFilterHooks: excludeFilterHooks,
    migrationDocLinks,
    esCapabilities,
  };
};
