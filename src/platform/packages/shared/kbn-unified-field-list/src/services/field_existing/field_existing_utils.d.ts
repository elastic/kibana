import type { estypes } from '@elastic/elasticsearch';
import type { DataViewField, RuntimeField } from '@kbn/data-views-plugin/common';
import type { DataViewsContract, DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import type { IKibanaSearchRequest } from '@kbn/search-types';
export type SearchHandler = (params: IKibanaSearchRequest['params']) => Promise<estypes.SearchResponse<Array<estypes.SearchHit<unknown>>>>;
/**
 * The number of docs to sample to determine field empty status.
 */
export interface Field {
    name: string;
    isScript: boolean;
    isMeta: boolean;
    lang?: estypes.ScriptLanguage;
    script?: string;
    runtimeField?: RuntimeField;
}
export declare function fetchFieldExistence({ search, dataViewsService, dataView, dslQuery, fromDate, toDate, timeFieldName, includeFrozen, metaFields, }: {
    search: SearchHandler;
    dataView: DataView;
    dslQuery: object;
    fromDate?: string;
    toDate?: string;
    timeFieldName?: string;
    includeFrozen: boolean;
    metaFields: string[];
    dataViewsService: DataViewsContract;
}): Promise<{
    indexPatternTitle: string;
    existingFieldNames: string[];
    newFields: FieldSpec[];
}>;
/**
 * Exported only for unit tests.
 */
export declare function buildFieldList(indexPattern: DataView, metaFields: string[]): Field[];
export declare function buildField(field: DataViewField, metaFields: string[]): Field;
/**
 * Exported only for unit tests.
 */
export declare function getExistingFields(filteredFields: FieldSpec[], allFields: Field[]): string[];
