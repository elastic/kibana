import type { estypes } from '@elastic/elasticsearch';
/**
 *
 * @param query
 * @returns
 *
 * @public
 */
export declare function luceneStringToDsl(query: string | NonNullable<estypes.QueryDslQueryContainer>): NonNullable<estypes.QueryDslQueryContainer>;
