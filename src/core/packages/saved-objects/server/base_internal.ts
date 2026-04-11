/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { DEFAULT_INDEX_TYPES_MAP, HASH_TO_VERSION_MAP } from './src/base_internal/constants';
export { LEGACY_URL_ALIAS_TYPE, type LegacyUrlAlias } from './src/base_internal/legacy_alias';
export {
  getProperty,
  getRootProperties,
  getRootPropertiesObjects,
  getTypes,
  type IndexMapping,
  type IndexMappingSafe,
  type IndexMappingMeta,
  type IndexTypesMap,
  type SavedObjectsTypeMappingDefinitions,
  type IndexMappingMigrationStateMeta,
} from './src/base_internal/mappings';
export { SavedObjectsSerializer } from './src/base_internal/serialization';
export { SavedObjectsTypeValidator } from './src/base_internal/validation';
export {
  decodeRequestVersion,
  decodeVersion,
  encodeVersion,
  encodeHitVersion,
} from './src/base_internal/version';
export {
  savedObjectsConfig,
  savedObjectsMigrationConfig,
  SavedObjectConfig,
  type SavedObjectsConfigType,
  type SavedObjectsMigrationConfigType,
} from './src/base_internal/saved_objects_config';
export type { ISavedObjectTypeRegistryInternal } from './src/base_internal/saved_objects_type_registry';
export { SavedObjectTypeRegistry } from './src/base_internal/saved_objects_type_registry';
export type {
  IKibanaMigrator,
  KibanaMigratorStatus,
  MigrationResult,
  MigrationStatus,
  MigrateDocumentOptions,
  IDocumentMigrator,
  DocumentMigrateOptions,
  IsDowngradeRequiredOptions,
} from './src/base_internal/migration';
export {
  parseObjectKey,
  getObjectKey,
  getIndexForType,
  getFieldListFromTypeMapping,
  getFieldListMapFromMappingDefinitions,
  type FieldListMap,
} from './src/base_internal/utils';
export {
  modelVersionVirtualMajor,
  initialModelVersion,
  globalSwitchToModelVersionAt,
  assertValidModelVersion,
  isVirtualModelVersion,
  virtualVersionToModelVersion,
  modelVersionToVirtualVersion,
  getModelVersionMapForTypes,
  getLatestModelVersion,
  getCurrentVirtualVersion,
  getVirtualVersionMap,
  getLatestMappingsVirtualVersionMap,
  type ModelVersionMap,
  type VirtualVersionMap,
  compareVirtualVersions,
  type CompareModelVersionMapParams,
  type CompareModelVersionStatus,
  type CompareModelVersionDetails,
  type CompareModelVersionResult,
  getVirtualVersionsFromMappings,
  getVirtualVersionsFromMappingMeta,
  getModelVersionDelta,
  buildModelVersionTransformFn,
  aggregateMappingAdditions,
  convertModelVersionBackwardConversionSchema,
  getVersionAddedMappings,
  getVersionAddedFields,
} from './src/base_internal/model_version';
