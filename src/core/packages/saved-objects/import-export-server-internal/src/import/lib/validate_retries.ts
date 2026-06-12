/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import { getNonUniqueEntries } from './get_non_unique_entries';
import { SavedObjectsImportError } from '../errors';

export const validateRetries = (retries: SavedObjectsImportRetry[]) => {
  const nonUniqueRetryObjects = getNonUniqueEntries(retries);
  if (nonUniqueRetryObjects.length > 0) {
    throw SavedObjectsImportError.nonUniqueRetryObjects(nonUniqueRetryObjects);
  }

  const destinationEntries = retries
    .filter((retry) => retry.destinationId !== undefined)
    .map(({ type, destinationId }) => ({ type, id: destinationId! }));
  const nonUniqueRetryDestinations = getNonUniqueEntries(destinationEntries);
  if (nonUniqueRetryDestinations.length > 0) {
    throw SavedObjectsImportError.nonUniqueRetryDestinations(nonUniqueRetryDestinations);
  }
};
