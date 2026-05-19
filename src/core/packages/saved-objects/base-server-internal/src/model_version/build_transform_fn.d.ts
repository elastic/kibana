import type { SavedObjectsModelChange, SavedObjectModelTransformationFn, SavedObjectsModelUnsafeTransformChange, SavedObjectsModelDataBackfillChange, SavedObjectsModelDataRemovalChange } from '@kbn/core-saved-objects-server';
/**
 * Build the transform function  for given model version, by chaining the transformations from its model changes.
 */
export declare const buildModelVersionTransformFn: (modelChanges: SavedObjectsModelChange[]) => SavedObjectModelTransformationFn;
export declare const dataRemovalChangeToTransformFn: (change: SavedObjectsModelDataRemovalChange) => SavedObjectModelTransformationFn;
export declare const dataBackfillChangeToTransformFn: (change: SavedObjectsModelDataBackfillChange) => SavedObjectModelTransformationFn;
export declare const unsafeTransformChangeToTransformFn: (change: SavedObjectsModelUnsafeTransformChange) => SavedObjectModelTransformationFn;
