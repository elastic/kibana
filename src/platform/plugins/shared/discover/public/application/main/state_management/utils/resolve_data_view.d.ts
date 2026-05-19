import type { DataView, DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DiscoverServices } from '../../../../build_services';
import type { RuntimeStateManager } from '../redux';
interface DataViewData {
    /**
     * Loaded data view (might be default data view if requested was not found)
     */
    loadedDataView: DataView;
    /**
     * Id of the requested data view
     */
    requestedDataViewId?: string;
    /**
     * Determines if requested data view was found
     */
    requestedDataViewFound: boolean;
}
/**
 * Function to load the given data view by id, providing a fallback if it doesn't exist
 */
export declare function loadDataView({ dataViewId, locationDataViewSpec, initialAdHocDataViewSpec, services: { dataViews }, savedDataViews, adHocDataViews, }: {
    dataViewId?: string;
    locationDataViewSpec?: DataViewSpec;
    initialAdHocDataViewSpec?: DataViewSpec;
    services: DiscoverServices;
    savedDataViews: DataViewListItem[];
    adHocDataViews: DataView[];
}): Promise<DataViewData>;
export declare const loadAndResolveDataView: ({ dataViewId, locationDataViewSpec, initialAdHocDataViewSpec, currentDataView, isEsqlMode, savedDataViews, runtimeStateManager, services, }: {
    dataViewId?: string;
    locationDataViewSpec?: DataViewSpec;
    initialAdHocDataViewSpec?: DataViewSpec;
    currentDataView?: DataView;
    isEsqlMode?: boolean;
    savedDataViews: DataViewListItem[];
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
}) => Promise<{
    fallback: boolean;
    dataView: DataView;
}>;
export {};
