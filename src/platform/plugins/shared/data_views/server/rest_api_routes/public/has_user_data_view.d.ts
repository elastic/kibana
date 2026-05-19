import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../common';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../../types';
interface HasUserDataViewArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
}
export declare const hasUserDataView: ({ dataViewsService, usageCollection, counterName, }: HasUserDataViewArgs) => Promise<boolean>;
export declare const registerHasUserDataViewRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerHasUserDataViewRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
