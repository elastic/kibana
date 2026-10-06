/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
interface FindLegacyUrlAliasesObject {
  type: string;
  id: string;
}
/**
 * Fetches all legacy URL aliases that match the given objects, returning a map of the matching aliases and what space(s) they exist in.
 *
 * @internal
 */
export declare function findLegacyUrlAliases(
  createPointInTimeFinder: CreatePointInTimeFinderFn,
  objects: FindLegacyUrlAliasesObject[],
  perPage?: number
): Promise<Map<string, Set<string>>>;
export {};
