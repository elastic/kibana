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
import { i18n } from '@kbn/i18n';
import { css, type SerializedStyles } from '@emotion/react';
import {
  useInTableSearchMatches,
  UseInTableSearchMatchesProps,
} from './use_in_table_search_matches';

export interface InTableSearchControlProps
  extends Omit<UseInTableSearchMatchesProps, 'scrollToActiveMatch'> {
  pageSize: number | null; // null when the pagination is disabled
  changeToExpectedPage: (pageIndex: number) => void;
  scrollToCell: (params: { rowIndex: number; columnIndex: number; align: 'start' }) => void;
  onChange: (searchTerm: string | undefined) => void;
  onChangeCss: (styles: SerializedStyles) => void;
}

export const InTableSearchControl: React.FC<InTableSearchControlProps> = ({
  pageSize,
  changeToExpectedPage,
  scrollToCell,
  onChange,
  onChangeCss,
  ...props
}) => {
  const scrollToActiveMatch: UseInTableSearchMatchesProps['scrollToActiveMatch'] = useCallback(
    ({ rowIndex, fieldName, matchIndex, shouldJump }) => {
      if (typeof pageSize === 'number') {
        const expectedPageIndex = Math.floor(rowIndex / pageSize);
        changeToExpectedPage(expectedPageIndex);
      }

      // TODO: use a named color token
      onChangeCss(css`
        .euiDataGridRowCell[data-gridcell-row-index='${rowIndex}'][data-gridcell-column-id='${fieldName}']
          .unifiedDataTable__inTableSearchMatch[data-match-index='${matchIndex}'] {
          background-color: #ffc30e;
        }
      `);

      if (shouldJump) {
        const anyCellForFieldName = document.querySelector(
          `.euiDataGridRowCell[data-gridcell-column-id='${fieldName}']`
        );

        // getting column index by column id
        const columnIndex = anyCellForFieldName?.getAttribute('data-gridcell-column-index') ?? 0;

        // getting rowIndex for the visible page
        const visibleRowIndex = typeof pageSize === 'number' ? rowIndex % pageSize : rowIndex;

        scrollToCell({
          rowIndex: visibleRowIndex,
          columnIndex: Number(columnIndex),
          align: 'start',
        });
      }
    },
    [pageSize, changeToExpectedPage, scrollToCell, onChangeCss]
  );

  const { matchesCount, activeMatchPosition, goToPrevMatch, goToNextMatch, isProcessing } =
    useInTableSearchMatches({ ...props, scrollToActiveMatch });

  const { inputValue, handleInputChange } = useDebouncedValue({
    onChange,
    value: props.inTableSearchTerm,
  });

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleInputChange(event.target.value);
    },
    [handleInputChange]
  );

  const onKeyUp = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (isProcessing) {
        return;
      }
      if (event.key === keys.ENTER && event.shiftKey) {
        goToPrevMatch();
      } else if (event.key === keys.ENTER) {
        goToNextMatch();
      }
    },
    [goToPrevMatch, goToNextMatch, isProcessing]
  );

  return (
    <EuiFieldSearch
      compressed
      isClearable
      isLoading={isProcessing}
      append={
        Boolean(inputValue?.length) && !isProcessing ? (
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
            {matchesCount > 0 ? (
              <>
                <EuiFlexItem grow={false}>{`${activeMatchPosition} / ${matchesCount}`}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="arrowUp"
                    aria-label={i18n.translate(
                      'unifiedDataTable.inTableSearch.buttonPreviousMatch',
                      {
                        defaultMessage: 'Previous match',
                      }
                    )}
                    onClick={goToPrevMatch}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="arrowDown"
                    aria-label={i18n.translate('unifiedDataTable.inTableSearch.buttonNextMatch', {
                      defaultMessage: 'Next match',
                    })}
                    onClick={goToNextMatch}
                  />
                </EuiFlexItem>
              </>
            ) : (
              <EuiFlexItem grow={false}>0</EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : undefined
      }
      placeholder={i18n.translate('unifiedDataTable.inTableSearch.inputPlaceholder', {
        defaultMessage: 'Find in the table',
      })}
      value={inputValue}
      onChange={onInputChange}
      onKeyUp={onKeyUp}
    />
  );
};
