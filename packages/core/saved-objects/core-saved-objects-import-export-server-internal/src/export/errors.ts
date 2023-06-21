/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';

/**
 * @public
 */
export class SavedObjectsExportError extends Error {
  constructor(
    public readonly type: string,
    message: string,
    public readonly attributes?: Record<string, any>
  ) {
    super(message);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, SavedObjectsExportError.prototype);
  }

  static exportSizeExceeded(limit: number) {
    return new SavedObjectsExportError(
      'export-size-exceeded',
      `Can't export more than ${limit} objects. ` +
        'If your server has enough memory, this limit can be increased ' +
        'by adjusting the "savedObjects.maxImportExportSize" setting.'
    );
  }

  static objectFetchError(objects: SavedObject[]) {
    return new SavedObjectsExportError('object-fetch-error', 'Error fetching objects to export', {
      objects,
    });
  }

  /**
   * Error returned when a {@link SavedObjectsExportTransform | export transform} threw an error
   */
  static objectTransformError(objects: SavedObject[], cause: Error) {
    return new SavedObjectsExportError(
      'object-transform-error',
      'Error transforming objects to export',
      {
        objects,
        cause: cause.message,
      }
    );
  }

  /**
   * Error returned when a {@link SavedObjectsExportTransform | export transform} performed an invalid operation
   * during the transform, such as removing objects from the export, or changing an object's type or id.
   */
  static invalidTransformError(objectKeys: string[]) {
    return new SavedObjectsExportError(
      'invalid-transform-error',
      'Invalid transform performed on objects to export',
      {
        objectKeys,
      }
    );
  }
}
