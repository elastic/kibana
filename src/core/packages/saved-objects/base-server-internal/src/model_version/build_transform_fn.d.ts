/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsModelChange,
  SavedObjectModelTransformationFn,
  SavedObjectsModelUnsafeTransformChange,
  SavedObjectsModelDataBackfillChange,
  SavedObjectsModelDataRemovalChange,
} from '@kbn/core-saved-objects-server';
/**
 * Build the transform function  for given model version, by chaining the transformations from its model changes.
 */
export declare const buildModelVersionTransformFn: (
  modelChanges: SavedObjectsModelChange[]
) => SavedObjectModelTransformationFn;
export declare const dataRemovalChangeToTransformFn: (
  change: SavedObjectsModelDataRemovalChange
) => SavedObjectModelTransformationFn;
export declare const dataBackfillChangeToTransformFn: (
  change: SavedObjectsModelDataBackfillChange
) => SavedObjectModelTransformationFn;
export declare const unsafeTransformChangeToTransformFn: (
  change: SavedObjectsModelUnsafeTransformChange
) => SavedObjectModelTransformationFn;
