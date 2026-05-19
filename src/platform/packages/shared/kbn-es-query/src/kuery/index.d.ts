import type { estypes } from '@elastic/elasticsearch';
import { toElasticsearchQuery as astToElasticsearchQuery } from './ast';
/**
 * @params {String} indexPattern
 * @params {Object} config - contains the dateFormatTZ
 *
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 */
export declare const toElasticsearchQuery: (...params: Parameters<typeof astToElasticsearchQuery>) => NonNullable<estypes.QueryDslQueryContainer>;
export { KQLSyntaxError } from './kuery_syntax_error';
export { nodeTypes, nodeBuilder } from './node_types';
export { fromKueryExpression, toKqlExpression } from './ast';
export { escapeKuery, escapeQuotes, getKqlFieldNames, getKqlFieldNamesFromExpression, getIsKqlFreeText, getIsKqlFreeTextExpression, } from './utils';
export type { DslQuery, KueryNode, KueryQueryOptions, KueryParseOptions } from './types';
