/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { ImportStateMap } from './types';
interface GetImportStateMapForRetriesParams {
  objects: SavedObject[];
  retries: SavedObjectsImportRetry[];
  createNewCopies: boolean;
}
/**
 * Assume that all objects exist in the `retries` map (due to filtering at the beginning of `resolveSavedObjectsImportErrors`).
 */
export declare function getImportStateMapForRetries(
  params: GetImportStateMapForRetriesParams
): ImportStateMap;
export {};
