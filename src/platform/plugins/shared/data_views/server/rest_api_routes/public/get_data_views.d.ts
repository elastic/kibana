import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../common';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../../types';
interface GetDataViewsArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
}
export declare const getDataViews: ({ dataViewsService, usageCollection, counterName, }: GetDataViewsArgs) => Promise<import("../../../common").DataViewListItem[]>;
export declare const registerGetDataViewsRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
