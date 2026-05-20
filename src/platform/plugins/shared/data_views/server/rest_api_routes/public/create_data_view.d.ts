import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewSpec } from '../../../common/types';
import type { DataViewsService } from '../../../common/data_views';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../../types';
interface CreateDataViewArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    spec: DataViewSpec;
    override?: boolean;
    refreshFields?: boolean;
    counterName: string;
}
export declare const createDataView: ({ dataViewsService, usageCollection, spec, override, counterName, }: CreateDataViewArgs) => Promise<import("../../../common/data_views").DataViewLazy>;
export declare const registerCreateDataViewRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerCreateDataViewRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
