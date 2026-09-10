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
import useEvent from 'react-use/lib/useEvent';
import { i18n } from '@kbn/i18n';
import { css, type SerializedStyles } from '@emotion/react';
import { useFindMatches } from './matches/use_find_matches';
import { InTableSearchInput } from './in_table_search_input';
import type { UseFindMatchesProps } from './types';
import { BUTTON_TEST_SUBJ, INPUT_TEST_SUBJ } from './constants';
import { getHighlightColors } from './get_highlight_colors';
import { getActiveMatchCss } from './get_active_match_css';

const inputWrapperCss = css`
  /* ensure nested search input borders are visible */
  position: relative;
  z-index: 1;

  .dataGridInTableSearch__matchesCounter {
    font-variant-numeric: tabular-nums;
  }

  .dataGridInTableSearch__input {
    /* to prevent the width from changing when entering the search term */
    min-width: 210px;
  }

  .euiFormControlLayout__append {
    background: none;
  }
`;

export interface UseInTableSearchControlProps
  extends Omit<UseFindMatchesProps, 'onScrollToActiveMatch'> {
  enabled?: boolean;
  pageSize: number | null;
  getColumnIndexFromId: (columnId: string) => number;
  scrollToCell: (params: { rowIndex: number; columnIndex: number; align: 'center' }) => void;
  shouldOverrideCmdF: (element: HTMLElement) => boolean;
  onChange: (searchTerm: string | undefined) => void;
  onChangeCss: (styles: SerializedStyles) => void;
  onChangeToExpectedPage: (pageIndex: number) => void;
}

export interface UseInTableSearchControlReturn {
  searchButton: React.ReactNode;
  searchInput: React.ReactNode;
  isInputVisible: boolean;
}

export const useInTableSearchControl = ({
  enabled = true,
  initialState,
  pageSize,
  getColumnIndexFromId,
  scrollToCell,
  shouldOverrideCmdF,
  onChange,
  onChangeCss,
  onChangeToExpectedPage,
  ...props
}: UseInTableSearchControlProps): UseInTableSearchControlReturn => {
  const { euiTheme } = useEuiTheme();
  const colors = useMemo(() => getHighlightColors(euiTheme), [euiTheme]);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReturnFocusToButtonRef = useRef<boolean>(false);
  const [isInputVisible, setIsInputVisible] = useState<boolean>(Boolean(props.inTableSearchTerm));

  const onScrollToActiveMatch: UseFindMatchesProps['onScrollToActiveMatch'] = useCallback(
    (activeMatch, animate) => {
      const { rowIndex, columnId } = activeMatch;

      if (typeof pageSize === 'number' && animate) {
        const expectedPageIndex = Math.floor(rowIndex / pageSize);
        onChangeToExpectedPage(expectedPageIndex);
      }

      onChangeCss(
        getActiveMatchCss({
          activeMatch,
          colors,
        })
      );

      if (animate) {
        // getting rowIndex for the visible page
        const visibleRowIndex = typeof pageSize === 'number' ? rowIndex % pageSize : rowIndex;

        scrollToCell({
          rowIndex: visibleRowIndex,
          columnIndex: getColumnIndexFromId(columnId),
          align: 'center',
        });
      }
    },
    [getColumnIndexFromId, scrollToCell, onChangeCss, onChangeToExpectedPage, pageSize, colors]
  );

  const {
    matchesCount,
    activeMatchPosition,
    isProcessing,
    goToPrevMatch,
    goToNextMatch,
    renderCellsShadowPortal,
    resetState,
  } = useFindMatches({ ...props, initialState, onScrollToActiveMatch });

  const showInput = useCallback(() => {
    setIsInputVisible(true);
  }, []);

  const hideInput = useCallback(
    (shouldReturnFocusToButton: boolean = false) => {
      setIsInputVisible(false);
      resetState();
      shouldReturnFocusToButtonRef.current = shouldReturnFocusToButton;
    },
    [resetState]
  );

  // listens for the cmd+f or ctrl+f keydown event to open the input
  const handleGlobalKeyDown = useCallback(
    (event: KeyboardEvent) => {
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
    },
    [showInput, shouldOverrideCmdF]
  );

  useEvent('keydown', handleGlobalKeyDown);

  // returns focus to the button when the input was cancelled by pressing the escape key
  useEffect(() => {
    if (shouldReturnFocusToButtonRef.current && !isInputVisible) {
      shouldReturnFocusToButtonRef.current = false;
      buttonRef.current?.focus();
    }
  }, [isInputVisible]);

  const searchButton =
    enabled && !isInputVisible ? (
      <EuiToolTip
        content={i18n.translate('dataGridInTableSearch.inputPlaceholder', {
          defaultMessage: 'Find in table',
        })}
      >
        <EuiButtonIcon
          data-test-subj={BUTTON_TEST_SUBJ}
          buttonRef={buttonRef}
          iconType="magnify"
          size="xs"
          color="text"
          className="dataGridInTableSearch__button"
          aria-label={i18n.translate('dataGridInTableSearch.buttonSearch', {
            defaultMessage: 'Find in table',
          })}
          onClick={showInput}
        />
      </EuiToolTip>
    ) : null;

  const searchInput =
    enabled && isInputVisible ? (
      <div ref={containerRef} css={inputWrapperCss}>
        <InTableSearchInput
          initialInTableSearchTerm={initialState?.searchTerm}
          matchesCount={matchesCount}
          activeMatchPosition={activeMatchPosition}
          isProcessing={isProcessing}
          goToPrevMatch={goToPrevMatch}
          goToNextMatch={goToNextMatch}
          onChangeSearchTerm={onChange}
          onHideInput={hideInput}
        />
        {/* We include it here so the same parent contexts (like KibanaRenderContextProvider, UnifiedDataTableContext etc) will be applied to the portal components too */}
        {/* as they do for the current component */}
        {renderCellsShadowPortal ? renderCellsShadowPortal() : null}
      </div>
    ) : null;

  return { searchButton, searchInput, isInputVisible };
};
