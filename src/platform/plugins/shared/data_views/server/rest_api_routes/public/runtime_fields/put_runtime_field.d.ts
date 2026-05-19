import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../../common/data_views';
import type { RuntimeField } from '../../../../common/types';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../../../types';
interface PutRuntimeFieldArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
    id: string;
    name: string;
    runtimeField: RuntimeField;
}
export declare const putRuntimeField: ({ dataViewsService, usageCollection, counterName, id, name, runtimeField, }: PutRuntimeFieldArgs) => Promise<{
    dataView: import("../../../../common/data_views").DataViewLazy;
    fields: import("../../../../common").DataViewField[];
}>;
export declare const registerPutRuntimeFieldRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerPutRuntimeFieldRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
