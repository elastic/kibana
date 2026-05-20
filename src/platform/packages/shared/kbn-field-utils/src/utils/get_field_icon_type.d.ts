import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldBase, GetCustomFieldType } from '../types';
/**
 * Returns an icon type for a field
 * @param field
 * @param getCustomFieldType
 * @public
 */
export declare function getFieldIconType<T extends FieldBase = DataViewField>(field: T, getCustomFieldType?: GetCustomFieldType<T>): string;
