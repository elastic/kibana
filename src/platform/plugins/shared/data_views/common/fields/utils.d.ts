import type { DataViewFieldBase, IFieldSubTypeNested, IFieldSubTypeMulti } from '@kbn/es-query';
import type { DataViewField } from '.';
export declare function isFilterable(field: DataViewField): boolean;
export declare const isNestedField: typeof isDataViewFieldSubtypeNested;
export declare const isMultiField: typeof isDataViewFieldSubtypeMulti;
export declare const getFieldSubtypeMulti: typeof getDataViewFieldSubtypeMulti;
export declare const getFieldSubtypeNested: typeof getDataViewFieldSubtypeNested;
/**
 * Convert a dot.notated.string into a short
 * version (d.n.string)
 */
export declare function shortenDottedString(input: string): string;
type HasSubtype = Pick<DataViewFieldBase, 'subType'>;
export declare function isDataViewFieldSubtypeNested(field: HasSubtype): boolean;
export declare function getDataViewFieldSubtypeNested(field: HasSubtype): IFieldSubTypeNested | undefined;
export declare function isDataViewFieldSubtypeMulti(field: HasSubtype): boolean;
/**
 * Returns subtype data for multi field
 * @public
 * @param field field to get subtype data from
 */
export declare function getDataViewFieldSubtypeMulti(field: HasSubtype): IFieldSubTypeMulti | undefined;
export {};
