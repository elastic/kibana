/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObject } from '../../../types';

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
      `Can't export more than ${limit} objects`
    );
  }

  static objectFetchError(objects: SavedObject[]) {
    return new SavedObjectsExportError('object-fetch-error', 'Error fetching objects to export', {
      objects,
    });
  }
}
