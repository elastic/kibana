/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css, type SerializedStyles } from '@emotion/react';
import {
  useInTableSearchMatches,
  UseInTableSearchMatchesProps,
} from './use_in_table_search_matches';
import { InTableSearchInput } from './in_table_search_input';
import './in_table_search.scss';

const BUTTON_TEST_SUBJ = 'startInTableSearchButton';

export interface InTableSearchControlProps
  extends Omit<UseInTableSearchMatchesProps, 'onScrollToActiveMatch'> {
  pageSize: number | null; // null when the pagination is disabled
  scrollToCell: (params: { rowIndex: number; columnIndex: number; align: 'smart' }) => void;
  shouldOverrideCmdF: (element: HTMLElement) => boolean;
  onChange: (searchTerm: string | undefined) => void;
  onChangeCss: (styles: SerializedStyles) => void;
  onChangeToExpectedPage: (pageIndex: number) => void;
}

export const InTableSearchControl: React.FC<InTableSearchControlProps> = ({
  pageSize,
  scrollToCell,
  shouldOverrideCmdF,
  onChange,
  onChangeCss,
  onChangeToExpectedPage,
  ...props
}) => {
  // const [buttonNode, setButtonNode] = useState<HTMLButtonElement | null>(null);
  const shouldReturnFocusToButtonRef = useRef<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const onScrollToActiveMatch: UseInTableSearchMatchesProps['onScrollToActiveMatch'] = useCallback(
    ({ rowIndex, columnId, matchIndexWithinCell }) => {
      if (typeof pageSize === 'number') {
        const expectedPageIndex = Math.floor(rowIndex / pageSize);
        onChangeToExpectedPage(expectedPageIndex);
      }

      // TODO: use a named color token
      onChangeCss(css`
        .euiDataGridRowCell[data-gridcell-row-index='${rowIndex}'][data-gridcell-column-id='${columnId}']
          .unifiedDataTable__inTableSearchMatch[data-match-index='${matchIndexWithinCell}'] {
          background-color: #ffc30e;
        }
      `);

      const anyCellForColumnId = document.querySelector(
        `.euiDataGridRowCell[data-gridcell-column-id='${columnId}']`
      );

      // getting column index by column id
      const columnIndex = anyCellForColumnId?.getAttribute('data-gridcell-column-index') ?? 0;

      // getting rowIndex for the visible page
      const visibleRowIndex = typeof pageSize === 'number' ? rowIndex % pageSize : rowIndex;

      scrollToCell({
        rowIndex: visibleRowIndex,
        columnIndex: Number(columnIndex),
        align: 'smart',
      });
    },
    [scrollToCell, onChangeCss, onChangeToExpectedPage, pageSize]
  );

  const {
    matchesCount,
    activeMatchPosition,
    isProcessing,
    goToPrevMatch,
    goToNextMatch,
    renderCellsShadowPortal,
    resetState,
    onChangeInTableSearchTerm,
  } = useInTableSearchMatches({ ...props, onScrollToActiveMatch });

  const onChangeSearchTerm = useCallback(
    (value: string) => {
      // sending the value to the grid and to the hook, so they can process it hopefully in parallel
      setTimeout(() => {
        onChange(value);
      }, 0);
      setTimeout(() => {
        onChangeInTableSearchTerm(value);
      }, 0);
    },
    [onChange, onChangeInTableSearchTerm]
  );

  const focusInput = useCallback(() => {
    setIsFocused(true);
  }, [setIsFocused]);

  const hideInput = useCallback(
    (shouldReturnFocusToButton: boolean = false) => {
      setIsFocused(false);
      resetState();
      shouldReturnFocusToButtonRef.current = shouldReturnFocusToButton;
    },
    [setIsFocused, resetState]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === 'f' &&
        shouldOverrideCmdF(event.target as HTMLElement)
      ) {
        event.preventDefault(); // prevent default browser find-in-page behavior
        focusInput();
        // TODO: refactor
        // inputRef.current?.focus(); // if it was already open before, make sure to shift the focus to it
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup the event listener
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [focusInput, shouldOverrideCmdF]);

  const shouldRenderButton = !isFocused;

  // TODO: refactor
  // useEffect(() => {
  //   if (shouldReturnFocusToButtonRef.current && buttonNode && shouldRenderButton) {
  //     shouldReturnFocusToButtonRef.current = false;
  //     buttonNode.focus();
  //   }
  // }, [buttonNode, shouldRenderButton]);

  if (shouldRenderButton) {
    return (
      <EuiToolTip
        content={i18n.translate('unifiedDataTable.inTableSearch.inputPlaceholder', {
          defaultMessage: 'Search in the table',
        })}
        delay="long"
      >
        <EuiButtonIcon
          // buttonRef={setButtonNode}
          data-test-subj={BUTTON_TEST_SUBJ}
          iconType="search"
          size="xs"
          color="text"
          className="unifiedDataTable__inTableSearchButton"
          aria-label={i18n.translate('unifiedDataTable.inTableSearch.inputPlaceholder', {
            defaultMessage: 'Search in the table',
          })}
          onClick={focusInput}
        />
      </EuiToolTip>
    );
  }

  return (
    <div className="unifiedDataTable__inTableSearchInputContainer">
      <InTableSearchInput
        matchesCount={matchesCount}
        activeMatchPosition={activeMatchPosition}
        isProcessing={isProcessing}
        goToPrevMatch={goToPrevMatch}
        goToNextMatch={goToNextMatch}
        onChangeSearchTerm={onChangeSearchTerm}
        onHideInput={hideInput}
      />
      {renderCellsShadowPortal ? renderCellsShadowPortal() : null}
    </div>
  );
};
