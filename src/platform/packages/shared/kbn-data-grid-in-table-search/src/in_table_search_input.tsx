/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent, FocusEvent, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-utils';
import {
  COUNTER_TEST_SUBJ,
  INPUT_TEST_SUBJ,
  BUTTON_PREV_TEST_SUBJ,
  BUTTON_NEXT_TEST_SUBJ,
} from './constants';

export interface InTableSearchInputProps {
  matchesCount: number | null;
  activeMatchPosition: number | null;
  isProcessing: boolean;
  goToPrevMatch: () => void;
  goToNextMatch: () => void;
  onChangeSearchTerm: (searchTerm: string) => void;
  onHideInput: (shouldReturnFocusToButton?: boolean) => void;
}

export const InTableSearchInput: React.FC<InTableSearchInputProps> = React.memo(
  ({
    matchesCount,
    activeMatchPosition,
    isProcessing,
    goToPrevMatch,
    goToNextMatch,
    onChangeSearchTerm,
    onHideInput,
  }) => {
    const { inputValue, handleInputChange } = useDebouncedValue({
      onChange: onChangeSearchTerm,
      value: '',
    });

    const onInputChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value;
        handleInputChange(nextValue);
      },
      [handleInputChange]
    );

    const onKeyUp = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === keys.ESCAPE) {
          onHideInput(true);
          return;
        }

        if (event.key === keys.ENTER && event.shiftKey) {
          goToPrevMatch();
        } else if (event.key === keys.ENTER) {
          goToNextMatch();
        }
      },
      [goToPrevMatch, goToNextMatch, onHideInput]
    );

    const onBlur = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        if (
          (!event.relatedTarget ||
            event.relatedTarget.getAttribute('data-test-subj') !== 'clearSearchButton') &&
          !inputValue
        ) {
          onHideInput();
        }
      },
      [onHideInput, inputValue]
    );

    const areArrowsDisabled = !matchesCount || isProcessing;

    return (
      <EuiFieldSearch
        autoFocus
        compressed
        className="dataGridInTableSearch__input"
        data-test-subj={INPUT_TEST_SUBJ}
        isClearable={!isProcessing}
        isLoading={isProcessing}
        append={
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem
              grow={false}
              className="dataGridInTableSearch__matchesCounter"
              data-test-subj={COUNTER_TEST_SUBJ}
            >
              <EuiText color="subdued" size="s">
                {matchesCount && activeMatchPosition
                  ? `${activeMatchPosition}/${matchesCount}`
                  : '0/0'}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="arrowUp"
                color="text"
                data-test-subj={BUTTON_PREV_TEST_SUBJ}
                disabled={areArrowsDisabled}
                aria-label={i18n.translate('dataGridInTableSearch.buttonPreviousMatch', {
                  defaultMessage: 'Previous',
                })}
                onClick={goToPrevMatch}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="arrowDown"
                color="text"
                data-test-subj={BUTTON_NEXT_TEST_SUBJ}
                disabled={areArrowsDisabled}
                aria-label={i18n.translate('dataGridInTableSearch.buttonNextMatch', {
                  defaultMessage: 'Next',
                })}
                onClick={goToNextMatch}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        placeholder={i18n.translate('dataGridInTableSearch.inputPlaceholder', {
          defaultMessage: 'Find in table',
        })}
        value={inputValue}
        onChange={onInputChange}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
      />
    );
  }
);
