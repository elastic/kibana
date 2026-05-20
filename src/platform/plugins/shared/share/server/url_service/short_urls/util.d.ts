/**
 * This function escapes reserved characters as listed here:
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
 */
export declare const escapeSearchReservedChars: (str: string) => string;
/**
 * Allows only characters in slug that can appear as a part of a URL.
 */
export declare const validateSlug: (slug: string) => void;
