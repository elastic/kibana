/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  SavedObjectsModelVersion,
  SavedObjectsModelVersionMap,
  SavedObjectsModelVersionMapProvider,
} from './model_version';

export type {
  SavedObjectsModelChange,
  SavedObjectsModelMappingsAdditionChange,
  SavedObjectsModelMappingsDeprecationChange,
  SavedObjectsModelDataBackfillChange,
  SavedObjectsModelDataRemovalChange,
  SavedObjectsModelUnsafeTransformChange,
} from './model_change';

export type {
  SavedObjectModelTransformationDoc,
  SavedObjectModelTransformationContext,
  SavedObjectModelTransformationFn,
  SavedObjectModelTransformationResult,
  SavedObjectModelDataBackfillFn,
  SavedObjectModelDataBackfillResult,
  SavedObjectModelUnsafeTransformFn,
} from './transformations';

export type {
  SavedObjectsModelVersionSchemaDefinitions,
  SavedObjectModelVersionForwardCompatibilitySchema,
  SavedObjectModelVersionForwardCompatibilityObjectSchema,
  SavedObjectModelVersionForwardCompatibilityFn,
} from './schemas';
