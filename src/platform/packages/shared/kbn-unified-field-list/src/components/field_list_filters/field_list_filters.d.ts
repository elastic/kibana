import React from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldNameSearchProps } from './field_name_search';
import { type FieldTypeFilterProps } from './field_type_filter';
import { type FieldListItem } from '../../types';
/**
 * Props for FieldListFilters component
 */
export interface FieldListFiltersProps<T extends FieldListItem> {
    'data-test-subj'?: string;
    docLinks: FieldTypeFilterProps<T>['docLinks'];
    selectedFieldTypes?: FieldTypeFilterProps<T>['selectedFieldTypes'];
    allFields?: FieldTypeFilterProps<T>['allFields'];
    getCustomFieldType?: FieldTypeFilterProps<T>['getCustomFieldType'];
    onSupportedFieldFilter?: FieldTypeFilterProps<T>['onSupportedFieldFilter'];
    onChangeFieldTypes: FieldTypeFilterProps<T>['onChange'];
    onFieldNameSearchFocus?: () => void;
    onFieldNameSearchBlur?: () => void;
    compressed?: FieldNameSearchProps['compressed'];
    nameFilter: FieldNameSearchProps['nameFilter'];
    screenReaderDescriptionId?: FieldNameSearchProps['screenReaderDescriptionId'];
    onChangeNameFilter: FieldNameSearchProps['onChange'];
}
/**
 * Field list filters which include search by field name and filtering by field type.
 * Use in combination with `useGroupedFields` hook. Or for more control - `useFieldFilters()` hook.
 * @param dataTestSubject
 * @param docLinks
 * @param selectedFieldTypes
 * @param allFields
 * @param getCustomFieldType
 * @param onSupportedFieldFilter
 * @param onChangeFieldTypes
 * @param compressed
 * @param nameFilter
 * @param screenReaderDescriptionId
 * @param onChangeNameFilter
 * @public
 * @constructor
 */
declare function InnerFieldListFilters<T extends FieldListItem = DataViewField>({ 'data-test-subj': dataTestSubject, docLinks, selectedFieldTypes, allFields, getCustomFieldType, onSupportedFieldFilter, onChangeFieldTypes, compressed, nameFilter, screenReaderDescriptionId, onChangeNameFilter, onFieldNameSearchBlur, onFieldNameSearchFocus, }: FieldListFiltersProps<T>): React.JSX.Element;
export type GenericFieldListFilters = typeof InnerFieldListFilters;
declare const FieldListFilters: GenericFieldListFilters;
export default FieldListFilters;
