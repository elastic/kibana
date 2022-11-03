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
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type {
  IndexMapping,
  SavedObjectsMigrationConfigType,
} from '@kbn/core-saved-objects-base-server-internal';
import type { InitState } from './state';
import { excludeUnusedTypesQuery } from './core';

/**
 * Construct the initial state for the model
 */
export const createInitialState = ({
  kibanaVersion,
  waitForMigrationCompletion,
  targetMappings,
  preMigrationScript,
  migrationVersionPerType,
  indexPrefix,
  migrationsConfig,
  typeRegistry,
  docLinks,
  logger,
}: {
  kibanaVersion: string;
  waitForMigrationCompletion: boolean;
  targetMappings: IndexMapping;
  preMigrationScript?: string;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  indexPrefix: string;
  migrationsConfig: SavedObjectsMigrationConfigType;
  typeRegistry: ISavedObjectTypeRegistry;
  docLinks: DocLinksServiceStart;
  logger: Logger;
}): InitState => {
  const outdatedDocumentsQuery = {
    bool: {
      should: Object.entries(migrationVersionPerType).map(([type, latestVersion]) => ({
        bool: {
          must: { term: { type } },
          must_not: { term: { [`migrationVersion.${type}`]: latestVersion } },
        },
      })),
    },
  };

  const reindexTargetMappings: IndexMapping = {
    dynamic: false,
    properties: {
      type: { type: 'keyword' },
      migrationVersion: {
        // @ts-expect-error we don't allow plugins to set `dynamic`
        dynamic: 'true',
        type: 'object',
      },
    },
  };

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
    indexPrefix,
    legacyIndex: indexPrefix,
    currentAlias: indexPrefix,
    versionAlias: `${indexPrefix}_${kibanaVersion}`,
    versionIndex: `${indexPrefix}_${kibanaVersion}_001`,
    tempIndex: `${indexPrefix}_${kibanaVersion}_reindex_temp`,
    kibanaVersion,
    preMigrationScript: Option.fromNullable(preMigrationScript),
    targetIndexMappings: targetMappings,
    tempIndexMappings: reindexTargetMappings,
    outdatedDocumentsQuery,
    retryCount: 0,
    retryDelay: 0,
    retryAttempts: migrationsConfig.retryAttempts,
    batchSize: migrationsConfig.batchSize,
    maxBatchSizeBytes: migrationsConfig.maxBatchSizeBytes.getValueInBytes(),
    discardUnknownObjects: migrationsConfig.discardUnknownObjects === kibanaVersion,
    discardCorruptObjects: migrationsConfig.discardCorruptObjects === kibanaVersion,
    logs: [],
    excludeOnUpgradeQuery: excludeUnusedTypesQuery,
    knownTypes,
    excludeFromUpgradeFilterHooks: excludeFilterHooks,
    migrationDocLinks,
  };
};
