import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldIconProps } from './field_icon';
import type { FieldBase } from '../../types';
export declare function getFieldIconProps<T extends FieldBase = DataViewField>(field: T): FieldIconProps;
