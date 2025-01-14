/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { useFindSearchMatches } from '../hooks/use_find_search_matches';

export interface SearchControlProps {
  uiSearchTerm: string | undefined;
  visibleColumns: string[];
  rows: DataTableRecord[];
  dataView: DataView;
  fieldFormats: FieldFormatsStart;
  onChange: (searchTerm: string | undefined) => void;
}

export const SearchControl: React.FC<SearchControlProps> = ({
  uiSearchTerm,
  visibleColumns,
  rows,
  dataView,
  fieldFormats,
  onChange,
}) => {
  const { matchesCount, isProcessing } = useFindSearchMatches({
    visibleColumns,
    rows,
    uiSearchTerm,
    dataView,
    fieldFormats,
  });

  // TODO: needs debouncing
  const onChangeUiSearchTerm = useCallback(
    (event) => {
      const nextUiSearchTerm = event.target.value.toLowerCase();
      onChange(nextUiSearchTerm);
    },
    [onChange]
  );

  return (
    <EuiFieldSearch
      compressed
      isClearable
      isLoading={isProcessing}
      append={matchesCount || undefined}
      placeholder="Search in the table" // TODO: i18n
      value={uiSearchTerm}
      onChange={onChangeUiSearchTerm}
    />
  );
};
