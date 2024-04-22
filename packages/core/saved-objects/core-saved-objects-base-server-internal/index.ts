/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { DEFAULT_INDEX_TYPES_MAP, HASH_TO_VERSION_MAP } from './src/constants';
export { LEGACY_URL_ALIAS_TYPE, type LegacyUrlAlias } from './src/legacy_alias';
export {
  getProperty,
  getRootProperties,
  getRootPropertiesObjects,
  getTypes,
  type IndexMapping,
  type IndexMappingMeta,
  type IndexTypesMap,
  type SavedObjectsTypeMappingDefinitions,
  type IndexMappingMigrationStateMeta,
} from './src/mappings';
export { SavedObjectsSerializer } from './src/serialization';
export { SavedObjectsTypeValidator } from './src/validation';
export {
  decodeRequestVersion,
  decodeVersion,
  encodeVersion,
  encodeHitVersion,
} from './src/version';
export {
  savedObjectsConfig,
  savedObjectsMigrationConfig,
  SavedObjectConfig,
  type SavedObjectsConfigType,
  type SavedObjectsMigrationConfigType,
} from './src/saved_objects_config';
export { SavedObjectTypeRegistry } from './src/saved_objects_type_registry';
export type {
  IKibanaMigrator,
  KibanaMigratorStatus,
  MigrationResult,
  MigrationStatus,
  MigrateDocumentOptions,
  IDocumentMigrator,
  DocumentMigrateOptions,
  IsDowngradeRequiredOptions,
} from './src/migration';
export {
  parseObjectKey,
  getObjectKey,
  getIndexForType,
  getFieldListFromTypeMapping,
  getFieldListMapFromMappingDefinitions,
  type FieldListMap,
} from './src/utils';
export {
  modelVersionVirtualMajor,
  globalSwitchToModelVersionAt,
  assertValidModelVersion,
  isVirtualModelVersion,
  virtualVersionToModelVersion,
  modelVersionToVirtualVersion,
  getModelVersionMapForTypes,
  getLatestModelVersion,
  getCurrentVirtualVersion,
  getLatestMigrationVersion,
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
} from './src/model_version';
