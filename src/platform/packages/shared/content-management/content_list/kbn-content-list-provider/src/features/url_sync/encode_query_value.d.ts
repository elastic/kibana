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
export declare const encodeQueryValue: (value: string) => string;
