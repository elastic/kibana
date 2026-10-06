/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsCollectMultiNamespaceReferencesPurpose } from '@kbn/core-saved-objects-api-server/src/apis';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
interface ObjectOrigin {
  /** The object's type. */
  type: string;
  /** The object's ID. */
  id: string;
  /** The object's origin is its `originId` field */
  origin: string | undefined;
}
/**
 * Fetches all objects with a shared origin, returning a map of the matching aliases and what space(s) they exist in.
 *
 * @internal
 */
export declare function findSharedOriginObjects(
  createPointInTimeFinder: CreatePointInTimeFinderFn,
  objects: ObjectOrigin[],
  perPage?: number,
  purpose?: SavedObjectsCollectMultiNamespaceReferencesPurpose
): Promise<Map<string, Set<string>>>;
export {};
