/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useState } from 'react';
import { uniq } from 'lodash';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldListFiltersProps } from '../components/field_list_filters';
import { type FieldListItem, type FieldTypeForFilter } from '../types';
import { FIELD_TYPE_NAMES } from '../components/field_list_filters/field_type_names';

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
  const [selectedFieldTypes, setSelectedFieldTypes] = useState<FieldTypeForFilter[]>([]);
  const [nameFilter, setNameFilter] = useState<string>('');
  const availableFieldTypes = useMemo(() => {
    if (!allFields?.length) {
      return undefined;
    }
    return uniq([
      ...(uniq(allFields.map(getFieldType)).filter(
        (type) => type in FIELD_TYPE_NAMES
      ) as FieldTypeForFilter[]),
      // always include current field type filters - there may not be any fields of the type of an existing type filter on data view switch, but we still need to include the existing filter in the list so that the user can remove it
      ...selectedFieldTypes,
    ]);
  }, [allFields, selectedFieldTypes]);

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
        return selectedFieldTypes.includes(getFieldType(field));
      }
      return true;
    },
    [selectedFieldTypes, nameFilter]
  );

  return useMemo(
    () => ({
      fieldNameHighlight: fieldListFiltersProps.nameFilter.toLowerCase(),
      fieldListFiltersProps,
      onFilterField,
    }),
    [fieldListFiltersProps, onFilterField]
  );
}

export function getFieldType<T extends FieldListItem = DataViewField>(
  field: T
): FieldTypeForFilter {
  // TODO: migrate `timeSeriesMetricType` logic from Lens to Unified Field List
  // if (field.timeSeriesMetricType) {
  //   return field.timeSeriesMetricType;
  // }
  return field.type as FieldTypeForFilter;
}
