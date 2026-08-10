/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Percent-encode a query value while leaving characters that RFC 3986 permits
 * unencoded in the query component as-is. Less aggressive than
 * `encodeURIComponent` (and than `query-string`'s default `strict: true`
 * mode), so Kibana URL conventions like Rison-encoded `_g` / `_a` values
 * round-trip without gratuitous percent-encoding.
 *
 * Per RFC 3986:
 *   `query      = *( pchar / "/" / "?" )`
 *   `pchar      = unreserved / pct-encoded / sub-delims / ":" / "@"`
 *   `sub-delims = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="`
 *
 * `&` and `=` stay encoded because they delimit key-value pairs, and `+`
 * stays encoded so a literal `+` is never misread as a space.
 *
 * TODO(https://github.com/elastic/kibana/issues/268689): replace this local
 * helper with the shared `encodeUriQuery` extracted from `kibana_utils` once
 * it is promoted to a shared package. The duplicate `encodeContentListValue`
 * in `@kbn/scout`'s `page_objects/content_list.ts` should collapse onto the
 * same shared helper at that point.
 */
export const encodeQueryValue = (value: string): string =>
  encodeURIComponent(value)
    .replace(/%21/g, '!')
    .replace(/%24/g, '$')
    .replace(/%27/g, "'")
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2A/g, '*')
    .replace(/%2C/g, ',')
    .replace(/%2F/g, '/')
    .replace(/%3A/g, ':')
    .replace(/%3B/g, ';')
    .replace(/%40/g, '@');
