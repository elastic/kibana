import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { type FieldListFiltersProps } from '../components/field_list_filters';
import type { GetCustomFieldType } from '../types';
import { type FieldListItem } from '../types';
/**
 * Input params for useFieldFilters hook
 */
export interface FieldFiltersParams<T extends FieldListItem> {
    allFields: T[] | null;
    getCustomFieldType?: GetCustomFieldType<T>;
    onSupportedFieldFilter?: (field: T) => boolean;
    services: {
        core: Pick<CoreStart, 'docLinks'>;
    };
}
/**
 * Output of useFieldFilters hook
 */
export interface FieldFiltersResult<T extends FieldListItem> {
    fieldSearchHighlight: string;
    fieldListFiltersProps: FieldListFiltersProps<T>;
    onFilterField?: (field: T) => boolean;
}
/**
 * A hook for managing field search and filters state
 * @param allFields
 * @param getCustomFieldType
 * @param onSupportedFieldFilter
 * @param services
 * @public
 */
export declare function useFieldFilters<T extends FieldListItem = DataViewField>({ allFields, getCustomFieldType, onSupportedFieldFilter, services, }: FieldFiltersParams<T>): FieldFiltersResult<T>;
