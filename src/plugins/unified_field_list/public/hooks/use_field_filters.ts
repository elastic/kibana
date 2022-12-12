/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useState } from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldListFiltersProps } from '../components/field_list_filters';
import { type FieldListItem, type FieldTypeKnown } from '../types';
import { isKnownFieldType, getFieldIconType, KNOWN_FIELD_TYPE_LIST } from '../utils/field_types';

export interface FieldFiltersParams<T extends FieldListItem> {
  allFields: T[] | null;
}

export interface FieldFiltersResult<T extends FieldListItem> {
  fieldNameHighlight: string;
  fieldListFiltersProps: Omit<FieldListFiltersProps, 'fieldSearchDescriptionId'>;
  onFilterField: (field: T) => boolean;
}

export function useFieldFilters<T extends FieldListItem = DataViewField>({
  allFields,
}: FieldFiltersParams<T>): FieldFiltersResult<T> {
  const [selectedFieldTypes, setSelectedFieldTypes] = useState<FieldTypeKnown[]>([]);
  const [nameFilter, setNameFilter] = useState<string>('');

  const knownFieldTypeCounts = useMemo(() => {
    if (!allFields?.length) {
      return undefined;
    }
    const counts = new Map();
    allFields.forEach((field) => {
      const type = getFieldIconType(field);
      if (isKnownFieldType(type)) {
        counts.set(type, (counts.get(type) || 0) + 1);
      }
    });
    return counts;
  }, [allFields]);

  const availableFieldTypes = useMemo(() => {
    // sorting is defined by items in KNOWN_FIELD_TYPE_LIST
    return KNOWN_FIELD_TYPE_LIST.filter((type) => {
      // always include current field type filters - there may not be any fields of the type of an existing type filter on data view switch, but we still need to include the existing filter in the list so that the user can remove it
      return knownFieldTypeCounts?.get(type) > 0 || selectedFieldTypes.includes(type);
    });
  }, [knownFieldTypeCounts, selectedFieldTypes]);

  const fieldListFiltersProps: FieldListFiltersProps = useMemo(
    () => ({
      selectedFieldTypes,
      availableFieldTypes,
      onChangeFieldTypes: setSelectedFieldTypes,
      nameFilter,
      onChangeNameFilter: setNameFilter,
      // TODO: add aria id
    }),
    [selectedFieldTypes, availableFieldTypes, setSelectedFieldTypes, nameFilter, setNameFilter]
  );

  const onFilterField = useCallback(
    (field: T) => {
      if (
        nameFilter.length &&
        !field.name.toLowerCase().includes(nameFilter.toLowerCase()) &&
        !field.displayName?.toLowerCase().includes(nameFilter.toLowerCase())
      ) {
        return false;
      }
      if (selectedFieldTypes.length > 0) {
        return selectedFieldTypes.includes(getFieldIconType(field));
      }
      return true;
    },
    [selectedFieldTypes, nameFilter]
  );

  return {
    fieldNameHighlight: nameFilter.toLowerCase(),
    fieldListFiltersProps,
    onFilterField,
  };
}
