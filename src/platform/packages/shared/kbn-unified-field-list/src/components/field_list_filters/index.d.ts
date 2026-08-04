import React from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListFiltersProps } from './field_list_filters';
import { type FieldListItem } from '../../types';
declare function WrappedFieldListFilters<T extends FieldListItem = DataViewField>(props: FieldListFiltersProps<T>): React.JSX.Element;
export declare const FieldListFilters: typeof WrappedFieldListFilters;
export type { FieldListFiltersProps };
