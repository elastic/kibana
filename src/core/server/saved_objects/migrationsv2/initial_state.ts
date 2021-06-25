/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Option from 'fp-ts/Option';
import { IndexMapping } from '../mappings';
import { SavedObjectsMigrationVersion } from '../../../types';
import { SavedObjectsMigrationConfigType } from '../saved_objects_config';
import type { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { InitState } from './types';
import { excludeUnusedTypesQuery } from '../migrations/core';

/**
 * Construct the initial state for the model
 */
export const createInitialState = ({
  kibanaVersion,
  targetMappings,
  preMigrationScript,
  migrationVersionPerType,
  indexPrefix,
  migrationsConfig,
  typeRegistry,
}: {
  kibanaVersion: string;
  targetMappings: IndexMapping;
  preMigrationScript?: string;
  migrationVersionPerType: SavedObjectsMigrationVersion;
  indexPrefix: string;
  migrationsConfig: SavedObjectsMigrationConfigType;
  typeRegistry: ISavedObjectTypeRegistry;
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

  return {
    controlState: 'INIT',
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
    logs: [],
    unusedTypesQuery: excludeUnusedTypesQuery,
    knownTypes,
  };
};
