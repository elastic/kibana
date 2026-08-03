import type { Filter, FilterCompareOptions } from '@kbn/es-query';
import type { DiscoverAppState, TabStateGlobalState } from '../redux';
/**
 * Helper function to compare 2 different filter states
 */
export declare function isEqualFilters(filtersA?: Filter[] | Filter, filtersB?: Filter[] | Filter, comparatorOptions?: FilterCompareOptions): boolean;
/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export declare function isEqualState<TState extends DiscoverAppState | TabStateGlobalState>(stateA: TState, stateB: TState, exclude?: Array<keyof TState>): boolean;
