import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../common/data_views';
import type { DataViewSpec } from '../../../common/types';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../../types';
interface UpdateDataViewArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    spec: DataViewSpec;
    id: string;
    refreshFields: boolean;
    counterName: string;
}
export declare const updateDataView: ({ dataViewsService, usageCollection, spec, id, refreshFields, counterName, }: UpdateDataViewArgs) => Promise<import("../../../common/data_views").DataViewLazy>;
export declare const registerUpdateDataViewRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerUpdateDataViewRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
