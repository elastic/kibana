/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FieldNameSearch, type FieldNameSearchProps } from './field_name_search';
import { FieldTypeFilter, type FieldTypeFilterProps } from './field_type_filter';

export interface FieldListFiltersProps {
  selectedFieldTypes: FieldTypeFilterProps['selectedFieldTypes'];
  availableFieldTypes: FieldTypeFilterProps['availableFieldTypes'];
  onChangeFieldTypes: FieldTypeFilterProps['onChange'];
  nameFilter: FieldNameSearchProps['nameFilter'];
  fieldSearchDescriptionId?: FieldNameSearchProps['fieldSearchDescriptionId'];
  onChangeNameFilter: FieldNameSearchProps['onChange'];
}

export const FieldListFilters: React.FC<FieldListFiltersProps> = ({
  selectedFieldTypes,
  availableFieldTypes,
  onChangeFieldTypes,
  nameFilter,
  fieldSearchDescriptionId,
  onChangeNameFilter,
}) => {
  return (
    <FieldNameSearch
      append={
        <FieldTypeFilter
          selectedFieldTypes={selectedFieldTypes}
          availableFieldTypes={availableFieldTypes}
          onChange={onChangeFieldTypes}
        />
      }
      nameFilter={nameFilter}
      fieldSearchDescriptionId={fieldSearchDescriptionId}
      onChange={onChangeNameFilter}
    />
  );
};
