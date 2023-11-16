/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getVirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
import { REMOVED_TYPES } from '../../core';
import type { MigrateIndexOptions } from '../migrate_index';
import type { MigratorContext } from './types';

export type CreateContextOps = Omit<MigrateIndexOptions, 'logger'>;

/**
 * Create the context object that will be used for this index migration.
 */
export const createContext = ({
  kibanaVersion,
  types,
  docLinks,
  migrationConfig,
  documentMigrator,
  elasticsearchClient,
  indexPrefix,
  typeRegistry,
  serializer,
  nodeRoles,
  esCapabilities,
}: CreateContextOps): MigratorContext => {
  return {
    migrationConfig,
    documentMigrator,
    kibanaVersion,
    indexPrefix,
    types,
    typeVirtualVersions: getVirtualVersionMap(types.map((type) => typeRegistry.getType(type)!)),
    elasticsearchClient,
    typeRegistry,
    serializer,
    maxRetryAttempts: migrationConfig.retryAttempts,
    migrationDocLinks: docLinks.links.kibanaUpgradeSavedObjects,
    deletedTypes: REMOVED_TYPES,
    batchSize: migrationConfig.batchSize,
    discardCorruptObjects: Boolean(migrationConfig.discardCorruptObjects),
    nodeRoles,
    esCapabilities,
  };
};
