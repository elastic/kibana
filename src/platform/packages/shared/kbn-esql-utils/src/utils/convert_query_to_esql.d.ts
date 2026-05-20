import { type Query } from '@kbn/es-query';
/**
 * Converts a KQL or Lucene query into an ES|QL expression that can be used inside a WHERE
 * clause. KQL maps to the `KQL(...)` function and Lucene maps to `QSTR(...)`.
 *
 * Returns an empty string when the query is missing, has no body, or uses an unsupported
 * language.
 */
export declare const convertQueryToESQLExpression: (query?: Query) => string;
