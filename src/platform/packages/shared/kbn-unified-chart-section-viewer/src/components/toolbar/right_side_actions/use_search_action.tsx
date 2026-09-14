/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiFieldSearch, keys, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { IconButton } from '@kbn/shared-ux-button-toolbar';
import {
  METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ,
  METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ,
} from '../../../common/constants';

export interface UseSearchActionProps {
  value: string;
  isFullscreen: boolean;
  onSearchTermChange: (value: string) => void;
}

export interface SearchAction {
  /** Descriptor for the collapsed magnifier button; `undefined` while the input is expanded. */
  searchButton?: IconButton;
  /** The expanded search field; `undefined` while collapsed. */
  searchInput?: React.ReactNode;
}

const searchButtonLabel = i18n.translate('metricsExperience.searchButton', {
  defaultMessage: 'Search metrics',
});

export const DEBOUNCE_TIME = 300;
const SEARCH_INPUT_MIN_WIDTH = 200;

/**
 * Builds the toolbar search control as an `IconButtonGroup` member plus the expanded input it
 * toggles into, so the collapsed magnifier renders as a real member of the grouped actions.
 */
export const useSearchAction = ({
  value,
  isFullscreen,
  onSearchTermChange,
}: UseSearchActionProps): SearchAction => {
  const { euiTheme } = useEuiTheme();

  const [searchTerm, setSearchTerm] = useState(value);

  const [showSearchInput, setShowSearchInput] = useState(false);

  useDebounce(() => onSearchTermChange(searchTerm), DEBOUNCE_TIME, [searchTerm]);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const onShowSearch = useCallback(() => {
    setShowSearchInput(true);
  }, []);

  useEffect(() => {
    if (searchTerm || value) {
      onShowSearch();
    }
  }, [onShowSearch, searchTerm, value]);

  const onClearSearch = useCallback(() => {
    setShowSearchInput(false);
    setSearchTerm('');
    onSearchTermChange('');
  }, [onSearchTermChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === keys.ESCAPE && !isFullscreen && showSearchInput) {
        onClearSearch();
      }
    },
    [isFullscreen, showSearchInput, onClearSearch]
  );

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [setSearchTerm]
  );

  const onBlur = useCallback(() => {
    if (searchTerm === '') {
      onClearSearch();
    }
  }, [onClearSearch, searchTerm]);

  const searchButton: IconButton | undefined = useMemo(
    () =>
      showSearchInput
        ? undefined
        : {
            iconType: 'magnify',
            label: searchButtonLabel,
            toolTipContent: searchButtonLabel,
            onClick: onShowSearch,
            'data-test-subj': METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ,
          },
    [showSearchInput, onShowSearch]
  );

  const searchInput = useMemo(
    () =>
      showSearchInput ? (
        <EuiFieldSearch
          autoFocus
          value={searchTerm}
          onChange={onSearchChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          placeholder={i18n.translate('metricsExperience.searchInputPlaceholder', {
            defaultMessage: 'Search metrics',
          })}
          fullWidth={false}
          compressed
          aria-label={i18n.translate('metricsExperience.searchInputAriaLabel', {
            defaultMessage: 'Search metrics',
          })}
          data-test-subj={METRICS_TOOLBAR_SEARCH_INPUT_DATA_TEST_SUBJ}
          css={css`
            min-width: ${SEARCH_INPUT_MIN_WIDTH}px;
            margin-inline-end: ${euiTheme.size.s};
          `}
        />
      ) : undefined,
    [showSearchInput, searchTerm, onSearchChange, handleKeyDown, onBlur, euiTheme.size.s]
  );

  return { searchButton, searchInput };
};
