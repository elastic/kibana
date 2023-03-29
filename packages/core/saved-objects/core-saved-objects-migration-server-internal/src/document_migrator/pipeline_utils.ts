/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { type Transform, TransformType } from './types';
// import { maxVersion } from './utils';

/** transform types using `coreMigrationVersion` and not `typeMigrationVersion` */
export const coreVersionTransformTypes = [TransformType.Core, TransformType.Reference];

/**
 * Apply the version of the given {@link Transform | transform} to the given {@link SavedObjectUnsanitizedDoc | document}.
 * Will update `coreMigrationVersion` or `typeMigrationVersion` depending on the type of the transform.
 */
export const applyVersion = ({
  document,
  transform,
}: {
  document: SavedObjectUnsanitizedDoc;
  transform: Transform;
}): SavedObjectUnsanitizedDoc => {
  return {
    ...document,
    ...(coreVersionTransformTypes.includes(transform.transformType)
      ? { coreMigrationVersion: transform.version }
      : { typeMigrationVersion: transform.version }),
  };
};
