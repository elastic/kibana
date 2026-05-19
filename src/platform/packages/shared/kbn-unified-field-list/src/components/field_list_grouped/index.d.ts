import React from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListGroupedProps } from './field_list_grouped';
import { type FieldListItem } from '../../types';
declare function WrappedFieldListGrouped<T extends FieldListItem = DataViewField>(props: FieldListGroupedProps<T>): React.JSX.Element;
export declare const FieldListGrouped: typeof WrappedFieldListGrouped;
export type { FieldListGroupedProps };
