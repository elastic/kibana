/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { buildActiveMappings, getBaseMappings } from './build_active_mappings';
export type { LogFn } from './migration_logger';
export { excludeUnusedTypesQuery, REMOVED_TYPES } from './unused_types';
export { TransformSavedObjectDocumentError } from './transform_saved_object_document_error';
export { deterministicallyRegenerateObjectId } from './regenerate_object_id';
export { buildTypesMappings } from './build_types_mappings';
export { createIndexMap, type IndexMap, type CreateIndexMapOptions } from './build_index_map';
export type {
  DocumentsTransformFailed,
  DocumentsTransformSuccess,
  TransformErrorObjects,
} from './migrate_raw_docs';
