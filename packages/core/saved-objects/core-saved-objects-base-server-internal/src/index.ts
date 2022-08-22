/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { LEGACY_URL_ALIAS_TYPE, type LegacyUrlAlias } from './legacy_alias';
export {
  getProperty,
  getRootProperties,
  getRootPropertiesObjects,
  getTypes,
  type IndexMapping,
  type IndexMappingMeta,
  type SavedObjectsTypeMappingDefinitions,
} from './mappings';
export { SavedObjectsSerializer } from './serialization';
export { SavedObjectsTypeValidator } from './validation';
export { decodeRequestVersion, decodeVersion, encodeVersion, encodeHitVersion } from './version';
export {
  savedObjectsConfig,
  savedObjectsMigrationConfig,
  SavedObjectConfig,
  type SavedObjectsConfigType,
  type SavedObjectsMigrationConfigType,
} from './saved_objects_config';
export { SavedObjectTypeRegistry } from './saved_objects_type_registry';
