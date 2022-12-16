/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { LEGACY_URL_ALIAS_TYPE, type LegacyUrlAlias } from './src/legacy_alias';
export {
  getProperty,
  getRootProperties,
  getRootPropertiesObjects,
  getTypes,
  type IndexMapping,
  type IndexMappingMeta,
  type SavedObjectsTypeMappingDefinitions,
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
} from './src/migration';
export { parseObjectKey, getObjectKey, getIndexForType } from './src/utils';
