/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Route validation bounds for saved_objects_management HTTP schemas.
 *
 * String bounds are grounded in the Elasticsearch document `_id` shape
 * `namespace:type:id` (ES caps `_id` at 512 bytes). `@kbn/config-schema`
 * `maxLength` counts UTF-16 characters, so these are defense-in-depth against
 * unbounded input rather than an exact mirror of the ES byte limit.
 *
 * `MAX_SAVED_OBJECTS_PER_BULK_REQUEST` matches the pre-existing bulk
 * request-array bound from https://github.com/elastic/kibana/issues/257318.
 */

/** Max length of a saved object `type`. */
export const MAX_SAVED_OBJECT_TYPE_LENGTH = 256;

/** Max length of a saved object `id`. */
export const MAX_SAVED_OBJECT_ID_LENGTH = 512;

/** Max length of free-text search / KQL filter input. */
export const MAX_SAVED_OBJECT_SEARCH_LENGTH = 10000;

/** Max number of saved objects in a single bulk-operation request array. */
export const MAX_SAVED_OBJECTS_PER_BULK_REQUEST = 10_000;
