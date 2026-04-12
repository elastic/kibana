/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObject } from '..';

/**
 * Context passed down to a {@link SavedObjectsExportTransform | export transform function}
 *
 * @public
 */
export interface SavedObjectsExportTransformContext {
  /**
   * The request that initiated the export request. Can be used to create scoped
   * services or client inside the {@link SavedObjectsExportTransform | transformation}
   */
  request: KibanaRequest;
}

/**
 * Transformation function used to mutate the exported objects of the associated type.
 *
 * A type's export transform function will be executed once per user-initiated export,
 * for all objects of that type.
 *
 * @remarks Trying to change an object's id or type during the transform will result in
 *          a runtime error during the export process.
 *
 * @public
 */
export type SavedObjectsExportTransform<T = unknown> = (
  context: SavedObjectsExportTransformContext,
  objects: Array<SavedObject<T>>
) => SavedObject[] | Promise<SavedObject[]>;
