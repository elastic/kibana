/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectErrorResult } from '@kbn/core-saved-objects-server';
/**
 * @public
 */
export declare class SavedObjectsExportError extends Error {
  readonly type: string;
  readonly attributes?: Record<string, any> | undefined;
  constructor(type: string, message: string, attributes?: Record<string, any> | undefined);
  static exportSizeExceeded(limit: number): SavedObjectsExportError;
  static objectFetchError(objects: SavedObjectErrorResult[]): SavedObjectsExportError;
  /**
   * Error returned when a {@link SavedObjectsExportTransform | export transform} threw an error
   */
  static objectTransformError(objects: SavedObject[], cause: Error): SavedObjectsExportError;
  /**
   * Error returned when a {@link SavedObjectsExportTransform | export transform} performed an invalid operation
   * during the transform, such as removing objects from the export, or changing an object's type or id.
   */
  static invalidTransformError(objectKeys: string[]): SavedObjectsExportError;
}
