/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type {
  CreatedObject,
  SavedObject,
  SavedObjectBulkResult,
  SavedObjectErrorResult,
} from '@kbn/core-saved-objects-server';
import type { LegacyUrlAlias } from '@kbn/core-saved-objects-base-server-internal';
/** A remapped bulk-create result, which is either a created object or an error result. */
export type RemappedImportResult<T> =
  | CreatedObject<T>
  | (SavedObjectErrorResult & {
      destinationId?: string;
    });
export declare function extractErrors(
  savedObjectResults: Array<RemappedImportResult<unknown>>,
  savedObjectsToImport: Array<SavedObject<any>>,
  legacyUrlAliasResults: SavedObjectBulkResult[],
  legacyUrlAliasesToCreate: Map<string, SavedObject<LegacyUrlAlias>>
): SavedObjectsImportFailure[];
