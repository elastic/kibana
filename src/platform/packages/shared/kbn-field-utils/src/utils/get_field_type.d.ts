import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldBase, FieldTypeKnown } from '../types';
/**
 * Returns a field type. Time series metric type will override the original field type.
 * @param field
 */
export declare function getFieldType<T extends FieldBase = DataViewField>(field: T): FieldTypeKnown;
