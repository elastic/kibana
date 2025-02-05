/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { merge as lodashMerge, unset } from 'lodash';
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
export const buildModelVersionTransformFn = (
  modelChanges: SavedObjectsModelChange[]
): SavedObjectModelTransformationFn => {
  const transformFns: SavedObjectModelTransformationFn[] = [];
  modelChanges.forEach((change) => {
    if (change.type === 'data_backfill') {
      transformFns.push(dataBackfillChangeToTransformFn(change));
    }
    if (change.type === 'data_removal') {
      transformFns.push(dataRemovalChangeToTransformFn(change));
    }
    if (change.type === 'unsafe_transform') {
      transformFns.push(unsafeTransformChangeToTransformFn(change));
    }
  });
  return mergeTransformFunctions(transformFns);
};

export const dataRemovalChangeToTransformFn = (
  change: SavedObjectsModelDataRemovalChange
): SavedObjectModelTransformationFn => {
  return (document, context) => {
    const attributes = document.attributes;
    change.removedAttributePaths.forEach((path) => {
      unset(attributes, path);
    });
    return { document };
  };
};

export const dataBackfillChangeToTransformFn = (
  change: SavedObjectsModelDataBackfillChange
): SavedObjectModelTransformationFn => {
  return (document, context) => {
    const result = change.backfillFn(document, context);
    const mergedAttributes = lodashMerge({}, document.attributes, result.attributes ?? {});
    return { document: { ...document, attributes: mergedAttributes } };
  };
};

export const unsafeTransformChangeToTransformFn = (
  change: SavedObjectsModelUnsafeTransformChange
): SavedObjectModelTransformationFn => {
  return change.transformFn;
};

const mergeTransformFunctions = (
  transformFns: SavedObjectModelTransformationFn[]
): SavedObjectModelTransformationFn => {
  if (transformFns.length === 0) {
    return noopTransform;
  }
  if (transformFns.length === 1) {
    return transformFns[0];
  }
  let mergedFn = transformFns[0];
  for (let i = 1; i < transformFns.length; i++) {
    mergedFn = merge(transformFns[i], mergedFn);
  }
  return mergedFn;
};

const noopTransform: SavedObjectModelTransformationFn = (doc) => ({ document: doc });

const merge = (
  outer: SavedObjectModelTransformationFn,
  inner: SavedObjectModelTransformationFn
): SavedObjectModelTransformationFn => {
  return (document, context) => {
    return outer(inner(document, context).document, context);
  };
};
