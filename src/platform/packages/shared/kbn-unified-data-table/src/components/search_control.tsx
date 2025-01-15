/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent, KeyboardEvent, useCallback } from 'react';
import { EuiFieldSearch, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, keys } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { useFindSearchMatches, UseFindSearchMatchesProps } from '../hooks/use_find_search_matches';

export interface SearchControlProps extends UseFindSearchMatchesProps {
  onChange: (searchTerm: string | undefined) => void;
}

export const SearchControl: React.FC<SearchControlProps> = ({
  uiSearchTerm,
  visibleColumns,
  rows,
  renderCellValue,
  scrollToFoundMatch,
  onChange,
}) => {
  const { matchesCount, activeMatchPosition, goToPrevMatch, goToNextMatch, isProcessing } =
    useFindSearchMatches({
      visibleColumns,
      rows,
      uiSearchTerm,
      renderCellValue,
      scrollToFoundMatch,
    });

  const { inputValue, handleInputChange } = useDebouncedValue({
    onChange,
    value: uiSearchTerm,
  });

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleInputChange(event.target.value);
    },
    [handleInputChange]
  );

  const onKeyUp = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === keys.ENTER) {
        goToNextMatch();
      }
    },
    [goToNextMatch]
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
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="arrowUp"
                aria-label="Previous match"
                disabled={activeMatchPosition <= 1}
                onClick={goToPrevMatch}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* TODO: i18n */}
              <EuiButtonIcon
                iconType="arrowDown"
                aria-label="Next match"
                disabled={activeMatchPosition >= matchesCount}
                onClick={goToNextMatch}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : undefined
      }
      placeholder="Search in the table" // TODO: i18n
      value={inputValue}
      onChange={onInputChange}
      onKeyUp={onKeyUp}
    />
  );
};
