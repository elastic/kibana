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
import { UseFindMatchesProps } from './types';
import {
  CELL_MATCH_INDEX_ATTRIBUTE,
  HIGHLIGHT_CLASS_NAME,
  BUTTON_TEST_SUBJ,
  INPUT_TEST_SUBJ,
} from './constants';
import { getHighlightColors } from './get_highlight_colors';

const innerCss = css`
  .dataGridInTableSearch__matchesCounter {
    font-variant-numeric: tabular-nums;
  }

  .dataGridInTableSearch__input {
    /* to prevent the width from changing when entering the search term */
    min-width: 210px;
  }

  .euiFormControlLayout__append {
    padding-inline: 0 !important;
    background: none;
  }

  /* override borders style only if it's under the custom grid toolbar */
  .unifiedDataTableToolbarControlIconButton & .euiFormControlLayout,
  .unifiedDataTableToolbarControlIconButton & .dataGridInTableSearch__input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
  }
`;

export interface InTableSearchControlProps
  extends Omit<UseFindMatchesProps, 'onScrollToActiveMatch'> {
  pageSize: number | null; // null when the pagination is disabled
  getColumnIndexFromId: (columnId: string) => number;
  scrollToCell: (params: { rowIndex: number; columnIndex: number; align: 'center' }) => void;
  shouldOverrideCmdF: (element: HTMLElement) => boolean;
  onChange: (searchTerm: string | undefined) => void;
  onChangeCss: (styles: SerializedStyles) => void;
  onChangeToExpectedPage: (pageIndex: number) => void;
}

export const InTableSearchControl: React.FC<InTableSearchControlProps> = ({
  pageSize,
  getColumnIndexFromId,
  scrollToCell,
  shouldOverrideCmdF,
  onChange,
  onChangeCss,
  onChangeToExpectedPage,
  ...props
}) => {
  const { euiTheme } = useEuiTheme();
  const colors = useMemo(() => getHighlightColors(euiTheme), [euiTheme]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const shouldReturnFocusToButtonRef = useRef<boolean>(false);
  const [isInputVisible, setIsInputVisible] = useState<boolean>(Boolean(props.inTableSearchTerm));

  const onScrollToActiveMatch: UseFindMatchesProps['onScrollToActiveMatch'] = useCallback(
    ({ rowIndex, columnId, matchIndexWithinCell }) => {
      if (typeof pageSize === 'number') {
        const expectedPageIndex = Math.floor(rowIndex / pageSize);
        onChangeToExpectedPage(expectedPageIndex);
      }

      // Defines highlight styles for the active match.
      // The cell border is useful when the active match is not visible due to the limited cell boundaries.
      onChangeCss(css`
        .euiDataGridRowCell[data-gridcell-row-index='${rowIndex}'][data-gridcell-column-id='${columnId}'] {
          &:after {
            content: '';
            z-index: 2;
            pointer-events: none;
            position: absolute;
            inset: 0;
            border: 2px solid ${colors.activeHighlightBorderColor} !important;
            border-radius: 3px;
          }
          .${HIGHLIGHT_CLASS_NAME}[${CELL_MATCH_INDEX_ATTRIBUTE}='${matchIndexWithinCell}'] {
            color: ${colors.activeHighlightColor} !important;
            background-color: ${colors.activeHighlightBackgroundColor} !important;
          }
        }
      `);

      // getting rowIndex for the visible page
      const visibleRowIndex = typeof pageSize === 'number' ? rowIndex % pageSize : rowIndex;

      scrollToCell({
        rowIndex: visibleRowIndex,
        columnIndex: getColumnIndexFromId(columnId),
        align: 'center',
      });
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
  } = useFindMatches({ ...props, onScrollToActiveMatch });

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
          {/* We include it here so the same parent contexts (like KibanaRenderContextProvider, UnifiedDataTableContext etc) will be applied to the portal components too */}
          {/* as they do for the current component */}
          {renderCellsShadowPortal ? renderCellsShadowPortal() : null}
        </>
      ) : (
        <EuiToolTip
          content={i18n.translate('dataGridInTableSearch.inputPlaceholder', {
            defaultMessage: 'Find in table',
          })}
          delay="long"
        >
          <EuiButtonIcon
            data-test-subj={BUTTON_TEST_SUBJ}
            buttonRef={buttonRef}
            iconType="search"
            size="xs"
            color="text"
            className="dataGridInTableSearch__button"
            aria-label={i18n.translate('dataGridInTableSearch.buttonSearch', {
              defaultMessage: 'Find in table',
            })}
            css={css`
              /* to make the transition between the button and input more seamless for cases where a custom toolbar is not used */
              min-height: calc(2 * ${euiTheme.size.base}); // input height
            `}
            onClick={showInput}
          />
        </EuiToolTip>
      )}
    </div>
  );
};
