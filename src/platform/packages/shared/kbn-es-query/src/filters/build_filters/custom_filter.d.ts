import type { FilterStateStore } from '@kbn/es-query-constants';
import type { estypes } from '@elastic/elasticsearch';
import type { Filter } from './types';
/** @public */
export type CustomFilter = Filter;
/**
 *
 * @param indexPatternString
 * @param queryDsl
 * @param disabled
 * @param negate
 * @param alias
 * @param store
 * @returns
 *
 * @public
 */
export declare function buildCustomFilter(indexPatternString: string, queryDsl: estypes.QueryDslQueryContainer, disabled: boolean, negate: boolean, alias: string | null, store: FilterStateStore): Filter;
