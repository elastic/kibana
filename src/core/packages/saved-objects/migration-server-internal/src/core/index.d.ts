export { buildActiveMappings, getBaseMappings } from './build_active_mappings';
export type { LogFn } from './migration_logger';
export { buildExcludeUnusedTypesQuery } from './unused_types';
export { TransformSavedObjectDocumentError } from './transform_saved_object_document_error';
export { deterministicallyRegenerateObjectId } from './regenerate_object_id';
export { buildTypesMappings } from './build_types_mappings';
export { createIndexMap, type IndexMap, type CreateIndexMapOptions } from './build_index_map';
export type { DocumentsTransformFailed, DocumentsTransformSuccess, TransformErrorObjects, } from './migrate_raw_docs';
