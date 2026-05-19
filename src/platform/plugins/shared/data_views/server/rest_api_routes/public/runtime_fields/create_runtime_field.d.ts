import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../../common/data_views';
import type { RuntimeField } from '../../../../common/types';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../../../types';
interface CreateRuntimeFieldArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
    id: string;
    name: string;
    runtimeField: RuntimeField;
}
export declare const createRuntimeField: ({ dataViewsService, usageCollection, counterName, id, name, runtimeField, }: CreateRuntimeFieldArgs) => Promise<{
    dataView: import("../../../../common/data_views").DataViewLazy;
    fields: import("../../../../common").DataViewField[];
}>;
export declare const registerCreateRuntimeFieldRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerCreateRuntimeFieldRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
