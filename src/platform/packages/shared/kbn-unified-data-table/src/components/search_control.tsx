/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFieldSearch, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
  scrollToRow: (rowIndex: number) => void;
  onChange: (searchTerm: string | undefined) => void;
}

export const SearchControl: React.FC<SearchControlProps> = ({
  uiSearchTerm,
  visibleColumns,
  rows,
  dataView,
  fieldFormats,
  scrollToRow,
  onChange,
}) => {
  const { matchesCount, activeMatchPosition, goToPrevMatch, goToNextMatch, isProcessing } =
    useFindSearchMatches({
      visibleColumns,
      rows,
      uiSearchTerm,
      dataView,
      fieldFormats,
      scrollToRow,
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
      append={
        matchesCount ? (
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>{`${activeMatchPosition} / ${matchesCount}`}</EuiFlexItem>
            {/* TODO: disabled states */}
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="arrowUp"
                aria-label="Previous match"
                onClick={goToPrevMatch}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* TODO: i18n */}
              <EuiButtonIcon iconType="arrowDown" aria-label="Next match" onClick={goToNextMatch} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : undefined
      }
      placeholder="Search in the table" // TODO: i18n
      value={uiSearchTerm}
      onChange={onChangeUiSearchTerm}
    />
  );
};
