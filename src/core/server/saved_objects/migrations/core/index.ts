/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { DocumentMigrator } from './document_migrator';
export { IndexMigrator } from './index_migrator';
export { buildActiveMappings } from './build_active_mappings';
export type { CallCluster } from './call_cluster';
export type { LogFn, SavedObjectsMigrationLogger } from './migration_logger';
export type { MigrationResult, MigrationStatus } from './migration_coordinator';
export { createMigrationEsClient } from './migration_es_client';
export type { MigrationEsClient } from './migration_es_client';
export { excludeUnusedTypesQuery, REMOVED_TYPES } from './elastic_index';
export { TransformSavedObjectDocumentError } from './transform_saved_object_document_error';
export type {
  DocumentsTransformFailed,
  DocumentsTransformSuccess,
  TransformErrorObjects,
} from './migrate_raw_docs';
