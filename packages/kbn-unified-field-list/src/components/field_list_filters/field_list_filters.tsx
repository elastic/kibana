/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { FieldNameSearch, type FieldNameSearchProps } from './field_name_search';
import { FieldTypeFilter, type FieldTypeFilterProps } from './field_type_filter';
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
function InnerFieldListFilters<T extends FieldListItem = DataViewField>({
  'data-test-subj': dataTestSubject = 'fieldListFilters',
  docLinks,
  selectedFieldTypes,
  allFields,
  getCustomFieldType,
  onSupportedFieldFilter,
  onChangeFieldTypes,
  compressed,
  nameFilter,
  screenReaderDescriptionId,
  onChangeNameFilter,
}: FieldListFiltersProps<T>) {
  return (
    <FieldNameSearch
      data-test-subj={dataTestSubject}
      append={
        allFields && selectedFieldTypes && onChangeFieldTypes ? (
          <FieldTypeFilter
            data-test-subj={dataTestSubject}
            docLinks={docLinks}
            selectedFieldTypes={selectedFieldTypes}
            allFields={allFields}
            getCustomFieldType={getCustomFieldType}
            onSupportedFieldFilter={onSupportedFieldFilter}
            onChange={onChangeFieldTypes}
          />
        ) : undefined
      }
      compressed={compressed}
      nameFilter={nameFilter}
      screenReaderDescriptionId={screenReaderDescriptionId}
      onChange={onChangeNameFilter}
    />
  );
}

export type GenericFieldListFilters = typeof InnerFieldListFilters;
const FieldListFilters = React.memo(InnerFieldListFilters) as GenericFieldListFilters;

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldListFilters;
