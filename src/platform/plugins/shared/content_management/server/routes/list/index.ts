/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @file Barrel exports for the content management list route utilities.
 *
 * This module provides building blocks for constructing advanced saved object
 * list queries, including:
 *
 * - **Types**: Response interfaces and internal data structures
 * - **Query Builder**: Functions for building Elasticsearch queries, runtime mappings, and sort configs
 * - **Transformers**: Functions for transforming ES hits to response format and enriching with user info
 * - **User Resolution**: Functions for resolving usernames/emails to UIDs and fetching user profiles
 *
 * @example
 * import {
 *   buildSearchQuery,
 *   buildSort,
 *   transformHits,
 *   fetchUserProfiles,
 * } from './list';
 */

export type {
  Reference,
  UserInfo,
  ListResponseItem,
  ResolvedFilters,
  ListResponse,
  DistinctCreatorsAggResult,
  ResolveCreatedByResult,
} from './types';

export {
  isValidFieldName,
  fieldNameSchema,
  buildRuntimeMappings,
  buildSort,
  buildSearchQuery,
} from './query_builder';
export type { BuildSearchQueryParams } from './query_builder';

export { transformHits } from './transformers';

export {
  isUserProfileUid,
  getDistinctCreators,
  resolveCreatedByFilter,
  fetchUserProfiles,
} from './user_resolution';

export { registerListRoute } from './route';
