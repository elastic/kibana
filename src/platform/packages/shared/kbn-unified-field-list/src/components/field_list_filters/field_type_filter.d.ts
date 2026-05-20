import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldTypeKnown } from '@kbn/field-utils';
import type { FieldListItem, GetCustomFieldType } from '../../types';
/**
 * Props for FieldTypeFilter component
 */
export interface FieldTypeFilterProps<T extends FieldListItem> {
    'data-test-subj': string;
    docLinks: CoreStart['docLinks'];
    allFields: T[] | null;
    getCustomFieldType?: GetCustomFieldType<T>;
    selectedFieldTypes: FieldTypeKnown[];
    onSupportedFieldFilter?: (field: T) => boolean;
    onChange: (fieldTypes: FieldTypeKnown[]) => unknown;
}
/**
 * A popover with field type filters
 * @param dataTestSubject
 * @param docLinks
 * @param allFields
 * @param getCustomFieldType
 * @param selectedFieldTypes
 * @param onSupportedFieldFilter
 * @param onChange
 * @constructor
 */
export declare function FieldTypeFilter<T extends FieldListItem = DataViewField>({ 'data-test-subj': dataTestSubject, docLinks, allFields, getCustomFieldType, selectedFieldTypes, onSupportedFieldFilter, onChange, }: FieldTypeFilterProps<T>): React.JSX.Element;
