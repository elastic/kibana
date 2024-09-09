/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useMemo } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { debounce } from 'lodash';
import { fieldNameWildcardMatcher, type FieldTypeKnown } from '@kbn/field-utils';
import type { FieldListItem } from '@kbn/unified-field-list';
import {
  FieldTypeFilter,
  type FieldTypeFilterProps,
} from '@kbn/unified-field-list/src/components/field_list_filters/field_type_filter';
import { getUnifiedDocViewerServices } from '../../plugin';

export const LOCAL_STORAGE_KEY_SEARCH_TERM = 'discover:searchText';
export const LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES = 'unifiedDocViewer:selectedFieldTypes';

const searchPlaceholder = i18n.translate('unifiedDocViewer.docView.table.searchPlaceHolder', {
  defaultMessage: 'Search field names',
});

interface TableFiltersCommonProps {
  // search
  searchTerm: string;
  onChangeSearchTerm: (searchTerm: string) => void;
  // field types
  selectedFieldTypes: FieldTypeFilterProps<FieldListItem>['selectedFieldTypes'];
  onChangeFieldTypes: FieldTypeFilterProps<FieldListItem>['onChange'];
}

export interface TableFiltersProps extends TableFiltersCommonProps {
  allFields: FieldListItem[];
}

export const TableFilters: React.FC<TableFiltersProps> = ({
  searchTerm,
  onChangeSearchTerm,
  selectedFieldTypes,
  onChangeFieldTypes,
  allFields,
}) => {
  const { core } = getUnifiedDocViewerServices();

  const onSearchTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSearchTerm = event.currentTarget.value;
      onChangeSearchTerm(newSearchTerm);
    },
    [onChangeSearchTerm]
  );

  return (
    <EuiFieldSearch
      data-test-subj="unifiedDocViewerFieldsSearchInput"
      aria-label={searchPlaceholder}
      placeholder={searchPlaceholder}
      fullWidth
      compressed
      value={searchTerm}
      onChange={onSearchTermChange}
      append={
        allFields && selectedFieldTypes && onChangeFieldTypes ? (
          <FieldTypeFilter
            data-test-subj="unifiedDocViewerFieldsTable"
            docLinks={core.docLinks}
            selectedFieldTypes={selectedFieldTypes}
            allFields={allFields}
            onChange={onChangeFieldTypes}
          />
        ) : undefined
      }
    />
  );
};

const persistSearchTerm = debounce(
  (newSearchText: string, storage: Storage) =>
    storage.set(LOCAL_STORAGE_KEY_SEARCH_TERM, newSearchText),
  500,
  { leading: true, trailing: true }
);

const persistSelectedFieldTypes = debounce(
  (selectedFieldTypes: FieldTypeKnown[], storage: Storage) =>
    storage.set(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES, JSON.stringify(selectedFieldTypes)),
  500,
  { leading: true, trailing: true }
);

const getStoredFieldTypes = (storage: Storage) => {
  const storedFieldTypes = storage.get(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES);
  let parsedFieldTypes: FieldTypeKnown[] = [];

  try {
    parsedFieldTypes = storedFieldTypes ? JSON.parse(storedFieldTypes) : [];
  } catch {
    // ignore invalid JSON
  }

  return Array.isArray(parsedFieldTypes) ? parsedFieldTypes : [];
};

interface UseTableFiltersReturn extends TableFiltersCommonProps {
  onFilterField: (
    fieldName: string,
    fieldDisplayName: string | undefined,
    fieldType: string | undefined
  ) => boolean;
}

export const useTableFilters = (storage: Storage): UseTableFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState(storage.get(LOCAL_STORAGE_KEY_SEARCH_TERM) || '');
  const [selectedFieldTypes, setSelectedFieldTypes] = useState<FieldTypeKnown[]>(
    getStoredFieldTypes(storage)
  );

  const onChangeSearchTerm = useCallback(
    (newSearchTerm: string) => {
      setSearchTerm(newSearchTerm);
      persistSearchTerm(newSearchTerm, storage);
    },
    [storage, setSearchTerm]
  );

  const onChangeFieldTypes = useCallback(
    (newFieldTypes: FieldTypeKnown[]) => {
      setSelectedFieldTypes(newFieldTypes);
      persistSelectedFieldTypes(newFieldTypes, storage);
    },
    [storage, setSelectedFieldTypes]
  );

  const onFilterField: UseTableFiltersReturn['onFilterField'] = useCallback(
    (fieldName, fieldDisplayName, fieldType) => {
      const term = searchTerm?.trim();
      if (
        term &&
        !fieldNameWildcardMatcher({ name: fieldName, displayName: fieldDisplayName }, term)
      ) {
        return false;
      }

      if (selectedFieldTypes.length > 0 && fieldType) {
        return selectedFieldTypes.includes(fieldType);
      }

      return true;
    },
    [searchTerm, selectedFieldTypes]
  );

  return useMemo(
    () => ({
      // props for TableFilters component
      searchTerm,
      onChangeSearchTerm,
      selectedFieldTypes,
      onChangeFieldTypes,
      // the actual filtering function
      onFilterField,
    }),
    [searchTerm, onChangeSearchTerm, selectedFieldTypes, onChangeFieldTypes, onFilterField]
  );
};
