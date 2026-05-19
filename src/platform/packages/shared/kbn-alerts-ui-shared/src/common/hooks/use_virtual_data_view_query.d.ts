import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
export interface UseVirtualDataViewParams {
    dataViewsService: DataViewsContract;
    /**
     * The index names to create the data view for
     */
    indexNames?: string[];
}
export declare const queryKeyPrefix: string[];
/**
 * Creates an in-memory data view, cached by index names
 *
 * When testing components that depend on this hook, prefer mocking {@link DataViewsContract}'s
 * create and clearInstanceCache method instead of the hook itself.
 * @external https://tanstack.com/query/v4/docs/framework/react/guides/testing
 */
export declare const useVirtualDataViewQuery: ({ dataViewsService, indexNames }: UseVirtualDataViewParams, options?: QueryOptionsOverrides<DataViewsContract["create"]>) => import("@kbn/react-query").UseQueryResult<import("@kbn/data-views-plugin/common").DataView, unknown>;
