/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { modelVersionVirtualMajor } from './constants';
export {
  assertValidModelVersion,
  isVirtualModelVersion,
  modelVersionToVirtualVersion,
  virtualVersionToModelVersion,
} from './conversion';
export {
  getModelVersionMapForTypes,
  getLatestModelVersion,
  getCurrentVirtualVersion,
  getVirtualVersionMap,
  getLatestMigrationVersion,
  type ModelVersionMap,
  type VirtualVersionMap,
} from './version_map';
export {
  compareVirtualVersions,
  type CompareModelVersionMapParams,
  type CompareModelVersionStatus,
  type CompareModelVersionDetails,
  type CompareModelVersionResult,
} from './version_compare';
export {
  getVirtualVersionsFromMappings,
  getVirtualVersionsFromMappingMeta,
} from './model_version_from_mappings';
export { getModelVersionDelta } from './get_version_delta';
export { buildModelVersionTransformFn } from './build_transform_fn';
export { aggregateMappingAdditions } from './aggregate_model_changes';
export { convertModelVersionBackwardConversionSchema } from './backward_conversion_schema';
