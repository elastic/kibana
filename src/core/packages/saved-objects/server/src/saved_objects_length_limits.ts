/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared bounds for saved object route request validation, covering both
 * string `maxLength` limits and array `maxSize` limits.
 *
 * The string-length bounds are grounded in the Elasticsearch document `_id`,
 * which for a saved object has the form `namespace:type:id`. Elasticsearch caps
 * a document `_id` at 512 bytes, so the individual segments are bounded well
 * within that budget.
 *
 * Caveat: `@kbn/config-schema` `maxLength` counts UTF-16 characters, while
 * Elasticsearch enforces its 512-byte `_id` limit in bytes (a multi-byte
 * character can consume several bytes). These bounds are therefore
 * defense-in-depth against unbounded input rather than an exact mirror of the
 * Elasticsearch limit.
 *
 * The array-size constants are a consistency improvement: they de-magic-number
 * the pre-existing request-array bounds introduced in
 * https://github.com/elastic/kibana/issues/257318, beyond the original
 * string-length fix. Their values are unchanged from those pre-existing
 * literals, so they do not alter validation behavior.
 */

/** Max length of a saved object `type`. */
export const MAX_SAVED_OBJECT_TYPE_LENGTH = 256;

/** Max length of a saved object `id`. */
export const MAX_SAVED_OBJECT_ID_LENGTH = 512;

/** Max length of a saved object `namespace` (space) identifier. */
export const MAX_SAVED_OBJECT_NAMESPACE_LENGTH = 512;

/** Max length of a saved object / reference `name` and `recordOf` attribute keys. */
export const MAX_SAVED_OBJECT_NAME_LENGTH = 1024;

/** Max length of `version`, `coreMigrationVersion` and `typeMigrationVersion` strings. */
export const MAX_SAVED_OBJECT_VERSION_LENGTH = 256;

/** Max length of free-text `search` and KQL `filter` query input. */
export const MAX_SAVED_OBJECT_SEARCH_LENGTH = 10000;

/**
 * Max length of the `_find` `aggs` query param (JSON aggregation string).
 * Larger than {@link MAX_SAVED_OBJECT_SEARCH_LENGTH} because aggregation
 * payloads can include nested clauses and large `terms` include/exclude lists.
 */
export const MAX_SAVED_OBJECT_AGGS_LENGTH = 100_000;

/** Max number of saved objects in a single bulk-operation request array. */
export const MAX_SAVED_OBJECTS_PER_BULK_REQUEST = 10_000;

/** Max number of references attached to a single saved object. */
export const MAX_SAVED_OBJECT_REFERENCES_PER_OBJECT = 1000;

/** Max number of items in a per-request namespaces / fields / reference array. */
export const MAX_SAVED_OBJECTS_PER_QUERY = 100;

/** Max number of items in a per-request saved object type-filter array. */
export const MAX_SAVED_OBJECT_TYPES_PER_QUERY = 100;
