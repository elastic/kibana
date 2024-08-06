/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { debounce } from 'lodash';
import { fieldNameWildcardMatcher } from '@kbn/field-utils';

const SEARCH_TEXT = 'discover:searchText';

const searchPlaceholder = i18n.translate('unifiedDocViewer.docView.table.searchPlaceHolder', {
  defaultMessage: 'Search field names',
});

interface TableFiltersCommonProps {
  searchTerm: string;
  onSearchTermChanged: (searchTerm: string) => void;
}

export const TableFilters: React.FC<TableFiltersCommonProps> = ({
  searchTerm,
  onSearchTermChanged,
}) => {
  const onSearchTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSearchTerm = event.currentTarget.value;
      onSearchTermChanged(newSearchTerm);
    },
    [onSearchTermChanged]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFieldSearch
          data-test-subj="unifiedDocViewerFieldsSearchInput"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          fullWidth
          compressed
          value={searchTerm}
          onChange={onSearchTermChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const persistSearchTerm = debounce(
  (newSearchText: string, storage: Storage) => storage.set(SEARCH_TEXT, newSearchText),
  500,
  { leading: true, trailing: true }
);

interface UseTableFiltersReturn extends TableFiltersCommonProps {
  onFilterField: (fieldName: string, fieldDisplayName: string | undefined) => boolean;
}

export const useTableFilters = (storage: Storage): UseTableFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState(storage.get(SEARCH_TEXT) || '');

  const onSearchTermChanged = useCallback(
    (newSearchTerm: string) => {
      setSearchTerm(newSearchTerm);
      persistSearchTerm(newSearchTerm, storage);
    },
    [storage, setSearchTerm]
  );

  const onFilterField: UseTableFiltersReturn['onFilterField'] = useCallback(
    (fieldName, fieldDisplayName) => {
      if (
        !searchTerm?.trim() ||
        fieldNameWildcardMatcher({ name: fieldName, displayName: fieldDisplayName }, searchTerm)
      ) {
        return true;
      }

      // TODO: Add support for filtering by field type

      return false;
    },
    [searchTerm]
  );

  return useMemo(
    () => ({
      // props for TableFilters component
      searchTerm,
      onSearchTermChanged,
      // the actual filtering function
      onFilterField,
    }),
    [searchTerm, onSearchTermChanged, onFilterField]
  );
};
