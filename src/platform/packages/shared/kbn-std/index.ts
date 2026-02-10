/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { assertNever } from './src/assert_never';
export type { Freezable } from './src/deep_freeze';
export { deepFreeze } from './src/deep_freeze';
export { get } from './src/get';
export { mapToObject } from './src/map_to_object';
export { merge } from './src/merge';
export { pick } from './src/pick';
export { withTimeout, isPromise } from './src/promise';
export type { URLMeaningfulParts } from './src/url';
export { isRelativeUrl, modifyUrl, getUrlOrigin } from './src/url';
export { isInternalURL } from './src/is_internal_url';
export { parseNextURL } from './src/parse_next_url';
export { getFlattenedObject } from './src/get_flattened_object';
export { ensureNoUnsafeProperties } from './src/ensure_no_unsafe_properties';
export {
  map$,
  mapWithLimit$,
  asyncMap,
  asyncMapWithLimit,
  asyncForEach,
  asyncForEachWithLimit,
} from './src/iteration';
export { ensureDeepObject, ensureValidObjectPath } from './src/ensure_deep_object';
export { Semaphore } from './src/semaphore';
export { stripVersionQualifier } from './src/strip_version_qualifier';
export { matchWildcardPattern } from './src/match_wildcard_pattern';

export { safeJsonParse } from './src/safe_json_parse';
export { safeJsonStringify } from './src/safe_json_stringify';
export { stableStringify, type StableStringifyOptions } from './src/stable_stringify';
export {
  prettyCompactStringify,
  type PrettyCompactStringifyOptions,
} from './src/pretty_compact_stringify';

export { bytePartition } from './src/byte_partition/byte_partition';

export { type FromExternalVariant, fromExternalVariant } from './src/from_external_variant';
