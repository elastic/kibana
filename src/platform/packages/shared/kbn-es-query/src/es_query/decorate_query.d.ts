import type { estypes } from '@elastic/elasticsearch';
import type { SerializableRecord } from '@kbn/utility-types';
/**
 * Decorate queries with default parameters
 * @param query object
 * @param queryStringOptions query:queryString:options from UI settings
 * @param dateFormatTZ dateFormat:tz from UI settings
 * @returns {object}
 *
 * @public
 */
export declare function decorateQuery(query: estypes.QueryDslQueryContainer, queryStringOptions: SerializableRecord | string, dateFormatTZ?: string): estypes.QueryDslQueryContainer;
