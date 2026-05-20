import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../../common/data_views';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../../../types';
interface GetRuntimeFieldArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
    id: string;
    name: string;
}
export declare const getRuntimeField: ({ dataViewsService, usageCollection, counterName, id, name, }: GetRuntimeFieldArgs) => Promise<{
    dataView: import("../../../../common/data_views").DataViewLazy;
    fields: import("../../../../common").DataViewField[];
}>;
export declare const registerGetRuntimeFieldRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerGetRuntimeFieldRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
