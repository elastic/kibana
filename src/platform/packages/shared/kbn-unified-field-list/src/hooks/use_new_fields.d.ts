import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListItem } from '../types';
import type { ExistingFieldsReader } from './use_existing_fields';
export interface UseNewFieldsParams<T extends FieldListItem> {
    dataView?: DataView | null;
    allFields: T[] | null;
    getNewFieldsBySpec?: (fields: FieldSpec[], dataView: DataView | null) => T[];
    fieldsExistenceReader: ExistingFieldsReader;
}
export interface UseNewFieldsResult<T extends FieldListItem> {
    allFieldsModified: T[] | null;
    hasNewFields: boolean;
}
/**
 * This hook is used to get the new fields of previous fields for wildcards request, and merges those
 * with the existing fields.
 */
export declare function useNewFields<T extends FieldListItem = DataViewField>({ dataView, allFields, getNewFieldsBySpec, fieldsExistenceReader, }: UseNewFieldsParams<T>): UseNewFieldsResult<T>;
