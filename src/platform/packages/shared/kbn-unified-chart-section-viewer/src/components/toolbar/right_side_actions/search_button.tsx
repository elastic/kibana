/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
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
  value: string;
  'data-test-subj'?: string;
  isFullscreen: boolean;
  onSearchTermChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

const searchButtonLabel = i18n.translate('metricsExperience.searchButton', {
  defaultMessage: 'Search',
});

const DEBOUNCE_TIME = 300;

export const SearchButton = ({
  value,
  isFullscreen,
  'data-test-subj': dataTestSubj,
  onSearchTermChange,
  onKeyDown,
}: RightSideActionsProps) => {
  const { euiTheme } = useEuiTheme();

  const [searchTerm, setSearchTerm] = useState(value);

  const [showSearchInput, setShowSearchInput] = useState(false);

  useDebounce(() => onSearchTermChange(searchTerm), DEBOUNCE_TIME, [searchTerm]);

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
  }, [setSearchTerm]);

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
      setSearchTerm(e.target.value);
    },
    [setSearchTerm]
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
                  border-right: 0;
                  min-width: 200px;

                  &::after {
                    border-right: 0;
                  }
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
                  border-top-right-radius: 0;
                  border-bottom-right-radius: 0;

                  &:focus {
                    outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
                    outline-offset: -${euiTheme.focus.width};
                  }
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
