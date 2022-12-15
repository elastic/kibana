/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useState } from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { type FieldListFiltersProps } from '../components/field_list_filters';
import { type FieldListItem, type FieldTypeKnown, GetCustomFieldType } from '../types';
import { getFieldIconType } from '../utils/field_types';

export interface FieldFiltersParams<T extends FieldListItem> {
  allFields: T[] | null;
  getCustomFieldType?: GetCustomFieldType<T>;
  onSupportedFieldFilter?: (field: T) => boolean;
  services: {
    core: Pick<CoreStart, 'docLinks'>;
  };
}

export interface FieldFiltersResult<T extends FieldListItem> {
  fieldSearchHighlight: string;
  fieldListFiltersProps: Omit<FieldListFiltersProps<T>, 'fieldSearchDescriptionId'>;
  onFilterField?: (field: T) => boolean;
}

export function useFieldFilters<T extends FieldListItem = DataViewField>({
  allFields,
  getCustomFieldType,
  onSupportedFieldFilter,
  services,
}: FieldFiltersParams<T>): FieldFiltersResult<T> {
  const [selectedFieldTypes, setSelectedFieldTypes] = useState<FieldTypeKnown[]>([]);
  const [nameFilter, setNameFilter] = useState<string>('');
  const docLinks = services.core.docLinks;

  return useMemo(() => {
    const fieldSearchHighlight = nameFilter.toLowerCase();
    return {
      fieldSearchHighlight,
      fieldListFiltersProps: {
        docLinks,
        selectedFieldTypes,
        allFields,
        getCustomFieldType,
        onSupportedFieldFilter,
        onChangeFieldTypes: setSelectedFieldTypes,
        nameFilter,
        onChangeNameFilter: setNameFilter,
      },
      onFilterField:
        fieldSearchHighlight?.length || selectedFieldTypes.length > 0
          ? (field: T) => {
              if (
                fieldSearchHighlight?.length &&
                !field.name.toLowerCase().includes(fieldSearchHighlight) &&
                !field.displayName?.toLowerCase().includes(fieldSearchHighlight)
              ) {
                return false;
              }
              if (selectedFieldTypes.length > 0) {
                return selectedFieldTypes.includes(getFieldIconType(field, getCustomFieldType));
              }
              return true;
            }
          : undefined,
    };
  }, [
    docLinks,
    selectedFieldTypes,
    allFields,
    getCustomFieldType,
    onSupportedFieldFilter,
    setSelectedFieldTypes,
    nameFilter,
    setNameFilter,
  ]);
}
