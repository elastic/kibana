/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MigratorContext } from './types';
import type { MigrateIndexOptions } from '../migrate_index';

export type CreateContextOps = Omit<MigrateIndexOptions, 'logger'>;

/**
 * Create the context object that will be used for this index migration.
 */
export const createContext = ({
  types,
  docLinks,
  migrationConfig,
  elasticsearchClient,
  indexPrefix,
  typeRegistry,
  serializer,
}: CreateContextOps): MigratorContext => {
  return {
    indexPrefix,
    types,
    elasticsearchClient,
    typeRegistry,
    serializer,
    maxRetryAttempts: migrationConfig.retryAttempts,
    migrationDocLinks: docLinks.links.kibanaUpgradeSavedObjects,
  };
};
