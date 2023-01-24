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
export class SavedObjectsImportError extends Error {
  private constructor(
    public readonly type: string,
    message: string,
    public readonly attributes?: Record<string, any>
  ) {
    super(message);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, SavedObjectsImportError.prototype);
  }

  static importSizeExceeded(limit: number) {
    return new SavedObjectsImportError(
      'import-size-exceeded',
      `Can't import more than ${limit} objects`
    );
  }

  static nonUniqueImportObjects(nonUniqueEntries: string[]) {
    return new SavedObjectsImportError(
      'non-unique-entries',
      `Non-unique import objects detected: [${nonUniqueEntries.join()}]`
    );
  }

  static nonUniqueRetryObjects(nonUniqueRetryObjects: string[]) {
    return new SavedObjectsImportError(
      'non-unique-retry-objects',
      `Non-unique retry objects: [${nonUniqueRetryObjects.join()}]`
    );
  }

  static nonUniqueRetryDestinations(nonUniqueRetryDestinations: string[]) {
    return new SavedObjectsImportError(
      'non-unique-retry-destination',
      `Non-unique retry destinations: [${nonUniqueRetryDestinations.join()}]`
    );
  }

  static referencesFetchError(objects: SavedObject[]) {
    return new SavedObjectsImportError(
      'references-fetch-error',
      'Error fetching references for imported objects',
      {
        objects,
      }
    );
  }
}
