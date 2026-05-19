import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../common';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../../types';
interface DeleteDataViewArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
    id: string;
}
export declare const deleteDataView: ({ dataViewsService, usageCollection, counterName, id, }: DeleteDataViewArgs) => Promise<void>;
export declare const registerDeleteDataViewRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerDeleteDataViewRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
