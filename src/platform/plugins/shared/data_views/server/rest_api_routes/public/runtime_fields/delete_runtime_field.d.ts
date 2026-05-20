import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../../common';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../../../types';
interface DeleteRuntimeFieldArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
    id: string;
    name: string;
}
export declare const deleteRuntimeField: ({ dataViewsService, usageCollection, counterName, id, name, }: DeleteRuntimeFieldArgs) => Promise<void>;
export declare const registerDeleteRuntimeFieldRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerDeleteRuntimeFieldRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
