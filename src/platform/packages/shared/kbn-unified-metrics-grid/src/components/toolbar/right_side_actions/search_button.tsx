/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  useEuiTheme,
  keys,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface RightSideActionsProps {
  searchTerm: string;
  'data-test-subj'?: string;
  isFullscreen: boolean;
  onSearchTermChange: (value: string) => void;
  onClearSearchTerm: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

const searchButtonLabel = i18n.translate('metricsExperience.searchButton', {
  defaultMessage: 'Search',
});

export const SearchButton = ({
  searchTerm,
  isFullscreen,
  'data-test-subj': dataTestSubj,
  onSearchTermChange,
  onClearSearchTerm,
  onKeyDown,
}: RightSideActionsProps) => {
  const { euiTheme } = useEuiTheme();

  const [showSearchInput, setShowSearchInput] = useState(false);

  const onShowSearch = useCallback(() => {
    setShowSearchInput(true);
  }, []);

  const onClearSearch = useCallback(() => {
    setShowSearchInput(false);
    onClearSearchTerm();
  }, [onClearSearchTerm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === keys.ESCAPE && !isFullscreen && showSearchInput) {
        onClearSearch();
      }

      onKeyDown(e);
    },
    [isFullscreen, showSearchInput, onClearSearch, onKeyDown]
  );

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchTermChange(e.target.value);
    },
    [onSearchTermChange]
  );

  const onBlur = useCallback(() => {
    if (searchTerm === '') {
      onClearSearch();
    }
  }, [onClearSearch, searchTerm]);

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none" alignItems="center">
          {showSearchInput ? (
            <EuiFlexItem grow={false}>
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
                data-test-subj={dataTestSubj}
                css={css`
                  border-top-right-radius: 0;
                  border-bottom-right-radius: 0;
                  min-width: 200px;
                `}
              />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="search"
                aria-label={searchButtonLabel}
                title={searchButtonLabel}
                onClick={onShowSearch}
                data-test-subj="metricsExperienceToolbarSearch"
                size="s"
                css={css`
                  border: ${euiTheme.border.thin};
                  border-right: none;
                  border-top-right-radius: 0;
                  border-bottom-right-radius: 0;
                `}
                color="text"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
