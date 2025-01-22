/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css, type SerializedStyles } from '@emotion/react';
import {
  useInTableSearchMatches,
  UseInTableSearchMatchesProps,
} from './use_in_table_search_matches';
import { InTableSearchInput, INPUT_TEST_SUBJ } from './in_table_search_input';

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
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReturnFocusToButtonRef = useRef<boolean>(false);
  const [isInputVisible, setIsInputVisible] = useState<boolean>(false);

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
          background-color: #ffc30e !important;
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
  } = useInTableSearchMatches({ ...props, onScrollToActiveMatch });

  const showInput = useCallback(() => {
    setIsInputVisible(true);
  }, [setIsInputVisible]);

  const hideInput = useCallback(
    (shouldReturnFocusToButton: boolean = false) => {
      setIsInputVisible(false);
      resetState();
      shouldReturnFocusToButtonRef.current = shouldReturnFocusToButton;
    },
    [setIsInputVisible, resetState]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === 'f' &&
        shouldOverrideCmdF(event.target as HTMLElement)
      ) {
        event.preventDefault(); // prevent default browser find-in-page behavior
        showInput();

        // if the input was already open before, make sure to shift the focus back to it
        (
          containerRef.current?.querySelector(
            `[data-test-subj="${INPUT_TEST_SUBJ}"]`
          ) as HTMLInputElement
        )?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup the event listener
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showInput, shouldOverrideCmdF]);

  useEffect(() => {
    if (shouldReturnFocusToButtonRef.current && !isInputVisible) {
      shouldReturnFocusToButtonRef.current = false;
      (
        containerRef.current?.querySelector(
          `[data-test-subj="${BUTTON_TEST_SUBJ}"]`
        ) as HTMLButtonElement
      )?.focus();
    }
  }, [isInputVisible]);

  const innerCss = useMemo(
    () => css`
      .unifiedDataTable__inTableSearchMatchesCounter {
        font-variant-numeric: tabular-nums;
      }

      .unifiedDataTable__inTableSearchButton {
        /* to make the transition between the button and input more seamless for cases where a custom toolbar is not used */
        min-height: 2 * ${euiTheme.size.base}; // input height
      }

      .unifiedDataTable__inTableSearchInput {
        /* to prevent the width from changing when entering the search term */
        min-width: 210px;
      }

      .euiFormControlLayout__append {
        padding-inline-end: 0 !important;
        background: none;
      }

      /* override borders style only if it's under the custom grid toolbar */
      .unifiedDataTableToolbarControlIconButton & .euiFormControlLayout,
      .unifiedDataTableToolbarControlIconButton & .unifiedDataTable__inTableSearchInput {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        border-right: 0;
      }
    `,
    [euiTheme]
  );

  return (
    <div ref={(node) => (containerRef.current = node)} css={innerCss}>
      {isInputVisible ? (
        <>
          <InTableSearchInput
            matchesCount={matchesCount}
            activeMatchPosition={activeMatchPosition}
            isProcessing={isProcessing}
            goToPrevMatch={goToPrevMatch}
            goToNextMatch={goToNextMatch}
            onChangeSearchTerm={onChange}
            onHideInput={hideInput}
          />
          {renderCellsShadowPortal ? renderCellsShadowPortal() : null}
        </>
      ) : (
        <EuiToolTip
          content={i18n.translate('unifiedDataTable.inTableSearch.inputPlaceholder', {
            defaultMessage: 'Search in the table',
          })}
          delay="long"
        >
          <EuiButtonIcon
            data-test-subj={BUTTON_TEST_SUBJ}
            iconType="search"
            size="xs"
            color="text"
            className="unifiedDataTable__inTableSearchButton"
            aria-label={i18n.translate('unifiedDataTable.inTableSearch.inputPlaceholder', {
              defaultMessage: 'Search in the table',
            })}
            onClick={showInput}
          />
        </EuiToolTip>
      )}
    </div>
  );
};
