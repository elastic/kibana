/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { buildMigratorConfigs, type MigratorConfig } from './get_migrator_configs';
export { getCurrentIndex } from './get_current_index';
export { checkVersionCompatibility } from './check_version_compatibility';
export { buildIndexMappings, buildIndexMeta } from './build_index_mappings';
export { getAliasActions } from './get_alias_actions';
export { generateAdditiveMappingDiff } from './generate_additive_mapping_diff';
export { getOutdatedDocumentsQuery } from './outdated_documents_query';
export { createDocumentTransformFn } from './transform_raw_docs';
export {
  setMetaMappingMigrationComplete,
  setMetaDocMigrationStarted,
  setMetaDocMigrationComplete,
  removePropertiesFromV2,
} from './update_index_meta';
export {
  checkIndexCurrentAlgorithm,
  type CheckCurrentAlgorithmResult,
} from './check_index_algorithm';
export { getCreationAliases } from './get_creation_aliases';
