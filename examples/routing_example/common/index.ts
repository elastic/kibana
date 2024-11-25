/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const RANDOM_NUMBER_ROUTE_PATH = '/api/random_number';

export const RANDOM_NUMBER_BETWEEN_ROUTE_PATH = '/api/random_number_between';

export const POST_MESSAGE_ROUTE_PATH = '/api/post_message';

// Internal APIs should use the `internal` prefix, instead of the `api` prefix.
export const INTERNAL_GET_MESSAGE_BY_ID_ROUTE = '/internal/get_message';

export const DEPRECATED_ROUTES = {
  DEPRECATED_ROUTE: '/api/routing_example/d/deprecated_route',
  REMOVED_ROUTE: '/api/routing_example/d/removed_route',
  MIGRATED_ROUTE: '/api/routing_example/d/migrated_route',
  VERSIONED_ROUTE: '/api/routing_example/d/versioned_route',
  INTERNAL_DEPRECATED_ROUTE: '/api/routing_example/d/internal_deprecated_route',
  INTERNAL_ONLY_ROUTE: '/internal/routing_example/d/internal_only_route',
  VERSIONED_INTERNAL_ROUTE: '/internal/routing_example/d/internal_versioned_route',
};
