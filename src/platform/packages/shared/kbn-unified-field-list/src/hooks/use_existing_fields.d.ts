import type { CoreStart } from '@kbn/core/public';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView, DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';
import { ExistenceFetchStatus, type ExistingFieldsInfo, type FetchedExistingFieldsInfo } from '../types';
export interface ExistingFieldsFetcherParams {
    disableAutoFetching?: boolean;
    dataViews: DataView[];
    fromDate: string | undefined;
    toDate: string | undefined;
    query: Query | AggregateQuery | undefined;
    filters: Filter[] | undefined;
    services: {
        core: Pick<CoreStart, 'uiSettings' | 'analytics'>;
        data: DataPublicPluginStart;
        dataViews: DataViewsContract;
    };
    onNoData?: (dataViewId: string) => unknown;
    /**
     * Custom container for existing fields info map
     */
    initialExistingFieldsInfo?: FetchedExistingFieldsInfo;
    onInitialExistingFieldsInfoChange?: (info: FetchedExistingFieldsInfo | undefined) => void;
}
export type ExistingFieldsByDataViewMap = Record<string, ExistingFieldsInfo>;
export interface ExistingFieldsFetcher {
    refetchFieldsExistenceInfo: (dataViewId?: string) => Promise<void>;
    isProcessing: boolean;
}
export interface ExistingFieldsReader {
    hasFieldData: (dataViewId: string, fieldName: string) => boolean;
    getFieldsExistenceStatus: (dataViewId: string) => ExistenceFetchStatus;
    isFieldsExistenceInfoUnavailable: (dataViewId: string) => boolean;
    getNewFields: (dataViewId: string) => FieldSpec[];
}
/**
 * Fetches info whether a field contains data or it's empty.
 * Can be used in combination with `useQuerySubscriber` hook for gathering the required params.
 * @param params
 * @public
 */
export declare const useExistingFieldsFetcher: (params: ExistingFieldsFetcherParams) => ExistingFieldsFetcher;
export declare const useExistingFieldsReader: () => ExistingFieldsReader;
export declare const resetExistingFieldsCache: () => void;
