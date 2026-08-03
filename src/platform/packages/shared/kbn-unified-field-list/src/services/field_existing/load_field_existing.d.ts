import type { IUiSettingsClient } from '@kbn/core/public';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView, DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';
interface FetchFieldExistenceParams {
    data: DataPublicPluginStart;
    dataView: DataView;
    fromDate: string;
    toDate: string;
    dslQuery: object;
    timeFieldName?: string;
    dataViewsService: DataViewsContract;
    uiSettingsClient: IUiSettingsClient;
}
export type LoadFieldExistingHandler = (params: FetchFieldExistenceParams) => Promise<{
    existingFieldNames: string[];
    indexPatternTitle: string;
    newFields?: FieldSpec[];
}>;
export declare const loadFieldExisting: LoadFieldExistingHandler;
export {};
