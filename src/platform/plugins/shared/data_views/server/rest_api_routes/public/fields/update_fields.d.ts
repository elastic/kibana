import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { DataViewsService } from '../../../../common';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../../../types';
interface UpdateFieldsArgs {
    dataViewsService: DataViewsService;
    usageCollection?: UsageCounter;
    counterName: string;
    id: string;
    fields: Record<string, FieldUpdateType>;
}
export declare const updateFields: ({ dataViewsService, usageCollection, counterName, id, fields, }: UpdateFieldsArgs) => Promise<import("../../../../common").DataViewLazy>;
interface FieldUpdateType {
    customLabel?: string | null;
    customDescription?: string | null;
    count?: number | null;
    format?: SerializedFieldFormat | null;
}
export declare const registerUpdateFieldsRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export declare const registerUpdateFieldsRouteLegacy: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, usageCollection?: UsageCounter) => void;
export {};
