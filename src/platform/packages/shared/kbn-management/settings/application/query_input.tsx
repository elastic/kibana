/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFormErrorText, EuiSearchBar, EuiSearchBarProps, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getCategoryName } from '@kbn/management-settings-utilities';
import React, { useState } from 'react';

export const DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR = 'settingsSearchBar';
export const CATEGORY_FIELD = 'categories';

/**
 * Props for a {@link QueryInput} component.
 */
export interface QueryInputProps {
  categories: string[];
  query?: Query;
  onQueryChange: (query?: Query) => void;
}

export const parseErrorMsg = i18n.translate(
  'management.settings.searchBar.unableToParseQueryErrorMessage',
  { defaultMessage: 'Unable to parse query' }
);

/**
 * Component for displaying a {@link EuiSearchBar} component for filtering settings and setting categories.
 */
export const QueryInput = ({ categories: categoryList, query, onQueryChange }: QueryInputProps) => {
  const [queryError, setQueryError] = useState<string | null>(null);

  const categories = categoryList.map((category) => ({
    value: category,
    name: getCategoryName(category),
  }));

  const box = {
    incremental: true,
    'data-test-subj': DATA_TEST_SUBJ_SETTINGS_SEARCH_BAR,
    placeholder: i18n.translate('management.settings.searchBarPlaceholder', {
      defaultMessage: 'Search advanced settings',
    }),
  };

  const filters = [
    {
      type: 'field_value_selection' as const,
      field: CATEGORY_FIELD,
      name: i18n.translate('management.settings.categorySearchLabel', {
        defaultMessage: 'Category',
      }),
      multiSelect: 'or' as const,
      options: categories,
    },
  ];

  const onChange: EuiSearchBarProps['onChange'] = ({ query: newQuery, error }) => {
    if (error) {
      setQueryError(error?.message || null);
      onQueryChange();
    } else {
      setQueryError(null);
      onQueryChange(newQuery || Query.parse(''));
    }
  };

  return (
    <>
      <EuiSearchBar {...{ box, filters, onChange, query }} />
      {queryError && <EuiFormErrorText>{`${parseErrorMsg}. ${queryError}`}</EuiFormErrorText>}
    </>
  );
};
