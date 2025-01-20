/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  ChangeEvent,
  FocusEvent,
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  EuiFieldSearch,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiText,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { css, type SerializedStyles } from '@emotion/react';
import {
  useInTableSearchMatches,
  UseInTableSearchMatchesProps,
} from './use_in_table_search_matches';
import './in_table_search.scss';

const BUTTON_TEST_SUBJ = 'startInTableSearchButton';

export interface InTableSearchControlProps
  extends Omit<UseInTableSearchMatchesProps, 'scrollToActiveMatch'> {
  pageSize: number | null; // null when the pagination is disabled
  changeToExpectedPage: (pageIndex: number) => void;
  scrollToCell: (params: { rowIndex: number; columnIndex: number; align: 'smart' }) => void;
  shouldOverrideCmdF: (element: HTMLElement) => boolean;
  onChange: (searchTerm: string | undefined) => void;
  onChangeCss: (styles: SerializedStyles) => void;
}

export const InTableSearchControl: React.FC<InTableSearchControlProps> = React.memo(
  ({
    pageSize,
    changeToExpectedPage,
    scrollToCell,
    shouldOverrideCmdF,
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
            align: 'smart',
          });
        }
      },
      [pageSize, changeToExpectedPage, scrollToCell, onChangeCss]
    );

    const {
      matchesCount,
      activeMatchPosition,
      isProcessing,
      cellsShadowPortal,
      goToPrevMatch,
      goToNextMatch,
      resetState,
    } = useInTableSearchMatches({ ...props, scrollToActiveMatch });
    const areArrowsDisabled = !matchesCount || isProcessing;
    const [inputValue, setInputValue] = useState<string>(props.inTableSearchTerm);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [buttonNode, setButtonNode] = useState<HTMLButtonElement | null>(null);
    const shouldReturnFocusToButtonRef = useRef<boolean>(false);
    const [isFocused, setIsFocused] = useState<boolean>(false);

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

    const debouncedOnChange = useMemo(
      () =>
        debounce(
          (value: string) => {
            onChange(value);
          },
          300,
          { leading: false, trailing: true }
        ),
      [onChange]
    );

    const onInputChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value;
        setInputValue(nextValue);
        debouncedOnChange(nextValue);
      },
      [debouncedOnChange, setInputValue]
    );

    const onKeyUp = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === keys.ESCAPE) {
          hideInput(true);
          return;
        }

        if (areArrowsDisabled) {
          return;
        }

        if (event.key === keys.ENTER && event.shiftKey) {
          goToPrevMatch();
        } else if (event.key === keys.ENTER) {
          goToNextMatch();
        }
      },
      [goToPrevMatch, goToNextMatch, hideInput, areArrowsDisabled]
    );

    const onBlur = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        if (
          (!event.relatedTarget ||
            event.relatedTarget.getAttribute('data-test-subj') !== 'clearSearchButton') &&
          !inputValue
        ) {
          hideInput();
        }
      },
      [hideInput, inputValue]
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
          inputRef.current?.focus(); // if it was already open before, make sure to shift the focus to it
        }
      };

      document.addEventListener('keydown', handleGlobalKeyDown);

      // Cleanup the event listener
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown);
      };
    }, [focusInput, shouldOverrideCmdF]);

    const shouldRenderButton = !isFocused && !inputValue;

    useEffect(() => {
      if (shouldReturnFocusToButtonRef.current && buttonNode && shouldRenderButton) {
        shouldReturnFocusToButtonRef.current = false;
        buttonNode.focus();
      }
    }, [buttonNode, shouldRenderButton]);

    if (shouldRenderButton) {
      return (
        <EuiToolTip
          content={i18n.translate('unifiedDataTable.inTableSearch.inputPlaceholder', {
            defaultMessage: 'Search in the table',
          })}
          delay="long"
        >
          <EuiButtonIcon
            buttonRef={setButtonNode}
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
        <EuiFieldSearch
          inputRef={(node) => (inputRef.current = node)}
          autoFocus
          compressed
          className="unifiedDataTable__inTableSearchInput"
          isClearable={!isProcessing}
          isLoading={isProcessing}
          append={
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false} className="unifiedDataTable__inTableSearchMatchesCounter">
                <EuiText color="subdued" size="s">
                  {matchesCount ? `${activeMatchPosition}/${matchesCount}` : '0/0'}&nbsp;
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowUp"
                  color="text"
                  disabled={areArrowsDisabled}
                  aria-label={i18n.translate('unifiedDataTable.inTableSearch.buttonPreviousMatch', {
                    defaultMessage: 'Previous',
                  })}
                  onClick={goToPrevMatch}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowDown"
                  color="text"
                  disabled={areArrowsDisabled}
                  aria-label={i18n.translate('unifiedDataTable.inTableSearch.buttonNextMatch', {
                    defaultMessage: 'Next',
                  })}
                  onClick={goToNextMatch}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          placeholder={i18n.translate('unifiedDataTable.inTableSearch.inputPlaceholder', {
            defaultMessage: 'Search in the table',
          })}
          value={inputValue}
          onChange={onInputChange}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
        />
        {cellsShadowPortal}
      </div>
    );
  }
);
