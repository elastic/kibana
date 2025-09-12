/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFieldSearch, keys } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface SearchInputProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onClear: () => void;
  'data-test-subj'?: string;
  showSearchInput: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  showSearchInput,
  searchTerm,
  onSearchTermChange,
  onClear,
  'data-test-subj': dataTestSubj = 'SearchInput',
}) => {
  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchTermChange(e.target.value);
    },
    [onSearchTermChange]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === keys.ESCAPE) {
        onClear();
      }
    },
    [onClear]
  );

  const onBlur = useCallback(() => {
    if (searchTerm === '') {
      onClear();
    }
  }, [onClear, searchTerm]);

  return showSearchInput ? (
    <EuiFieldSearch
      autoFocus
      value={searchTerm}
      onChange={onSearchChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={i18n.translate('metricsExperience.searchInputPlaceholder', {
        defaultMessage: 'Search metrics…',
      })}
      fullWidth={false}
      compressed
      aria-label={i18n.translate('metricsExperience.searchInputAriaLabel', {
        defaultMessage: 'Search metrics',
      })}
      data-test-subj={`${dataTestSubj}Input`}
      css={css`
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        min-width: 200px;
      `}
    />
  ) : undefined;
};
