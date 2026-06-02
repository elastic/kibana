import type { DataViewField } from './data_view_field';
import type { FieldSpec, DataViewFieldMap } from '../types';
import type { DataView } from '../data_views';
interface ToSpecOptions {
    getFormatterForField?: DataView['getFormatterForField'];
}
/**
 * Interface for data view field list which _extends_ the array class.
 */
export interface IIndexPatternFieldList extends Array<DataViewField> {
    /**
     * Creates a DataViewField instance. Does not add it to the data view.
     * @param field field spec to create field instance
     * @returns a new data view field instance
     */
    create(field: FieldSpec): DataViewField;
    /**
     * Add field to field list.
     * @param field field spec to add field to list
     * @returns data view field instance which was added to list
     */
    add(field: FieldSpec): DataViewField;
    /**
     * Returns fields as plain array of data view field instances.
     */
    getAll(): DataViewField[];
    /**
     * Get field by name. Optimized, uses map to find field.
     * @param name name of field to find
     * @returns data view field instance if found, undefined otherwise
     */
    getByName(name: DataViewField['name']): DataViewField | undefined;
    /**
     * Get fields by field type. Optimized, uses map to find fields.
     * @param type type of field to find
     * @returns array of data view field instances if found, empty array otherwise
     */
    getByType(type: DataViewField['type']): DataViewField[];
    /**
     * Remove field from field list
     * @param field field for removal
     */
    remove(field: DataViewField | FieldSpec): void;
    /**
     * Remove all fields from field list.
     */
    removeAll(): void;
    /**
     * Replace all fields in field list with new fields.
     * @param specs array of field specs to add to list
     */
    replaceAll(specs: FieldSpec[]): void;
    /**
     * Update a field in the list
     * @param field field spec to update
     */
    update(field: FieldSpec): void;
    /**
     * Field list as field spec map by name
     * @param options optionally provide a function to get field formatter for fields
     * @return map of field specs by name
     */
    toSpec(options?: ToSpecOptions): DataViewFieldMap;
}
export declare const fieldList: (specs?: FieldSpec[], shortDotsEnable?: boolean) => IIndexPatternFieldList;
export {};
