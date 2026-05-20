import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../common';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../../types';
interface GetDataViewArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
    id: string;
}
export declare const swapReference: ({ dataViewsService, usageCollection, counterName, id, }: GetDataViewArgs) => Promise<import("../../../common").DataView>;
export declare const swapReferencesRoute: ({ previewRoute }: {
    previewRoute: boolean;
}) => (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
