import React from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldIconProps } from './field_icon';
import { type FieldBase } from '../../types';
declare function WrappedFieldIcon<T extends FieldBase = DataViewField>(props: FieldIconProps): React.JSX.Element;
export declare const FieldIcon: typeof WrappedFieldIcon;
export type { FieldIconProps };
export { getFieldIconProps } from './get_field_icon_props';
