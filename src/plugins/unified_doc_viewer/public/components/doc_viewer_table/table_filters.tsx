/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

const SEARCH_TEXT = 'discover:searchText';

const searchPlaceholder = i18n.translate('unifiedDocViewer.docView.table.searchPlaceHolder', {
  defaultMessage: 'Search field names',
});

interface TableFiltersCommonProps {
  // search
  searchTerm: string;
  onSearchTermChanged: (searchTerm: string) => void;
  // field types
  selectedFieldTypes: FieldTypeFilterProps<FieldListItem>['selectedFieldTypes'];
  onChangeFieldTypes: FieldTypeFilterProps<FieldListItem>['onChange'];
}

export interface TableFiltersProps extends TableFiltersCommonProps {
  allFields: FieldListItem[];
}

export const TableFilters: React.FC<TableFiltersProps> = ({
  searchTerm,
  onSearchTermChanged,
  selectedFieldTypes,
  onChangeFieldTypes,
  allFields,
}) => {
  const { core } = getUnifiedDocViewerServices();

  const onSearchTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSearchTerm = event.currentTarget.value;
      onSearchTermChanged(newSearchTerm);
    },
    [onSearchTermChanged]
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
            data-test-subj="unifiedDocViewerFieldsFilterByType"
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
  (newSearchText: string, storage: Storage) => storage.set(SEARCH_TEXT, newSearchText),
  500,
  { leading: true, trailing: true }
);

interface UseTableFiltersReturn extends TableFiltersCommonProps {
  onFilterField: (
    fieldName: string,
    fieldDisplayName: string | undefined,
    fieldType: string | undefined
  ) => boolean;
}

export const useTableFilters = (storage: Storage): UseTableFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState(storage.get(SEARCH_TEXT) || '');
  const [selectedFieldTypes, setSelectedFieldTypes] = useState<FieldTypeKnown[]>([]);

  const onSearchTermChanged = useCallback(
    (newSearchTerm: string) => {
      setSearchTerm(newSearchTerm);
      persistSearchTerm(newSearchTerm, storage);
    },
    [storage, setSearchTerm]
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
      onSearchTermChanged,
      selectedFieldTypes,
      onChangeFieldTypes: setSelectedFieldTypes,
      // the actual filtering function
      onFilterField,
    }),
    [searchTerm, onSearchTermChanged, selectedFieldTypes, setSelectedFieldTypes, onFilterField]
  );
};
