/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldSearch, EuiFlexItem } from '@elastic/eui';
import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import styled from 'styled-components';
import * as i18n from '../../../../common/translations';

const SEARCH_DEBOUNCE_MS = 300;

const SearchBarWrapper = styled(EuiFlexItem)`
  min-width: 200px;
  & .euiPopover {
    // This is needed to "cancel" styles passed down from EuiTourStep that
    // interfere with EuiFieldSearch and don't allow it to take the full width
    display: block;
  }
`;

interface WorkflowSearchFieldProps {
  initialValue?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
}

export function WorkflowSearchField({
  initialValue,
  onSearch,
  placeholder,
}: WorkflowSearchFieldProps): JSX.Element {
  const [searchText, setSearchText] = useState(initialValue);
  const isUserChange = useRef(false);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    isUserChange.current = true;
    setSearchText(e.target.value);
  }, []);

  useEffect(() => {
    isUserChange.current = false;
    setSearchText(initialValue);
  }, [initialValue]);

  useDebounce(
    () => {
      if (isUserChange.current) {
        onSearchRef.current(searchText ?? '');
      }
    },
    SEARCH_DEBOUNCE_MS,
    [searchText]
  );

  return (
    <SearchBarWrapper grow>
      <EuiFieldSearch
        aria-label={i18n.SEARCH_WORKFLOWS}
        fullWidth
        incremental
        placeholder={placeholder ?? i18n.SEARCH_PLACEHOLDER}
        value={searchText}
        onChange={handleChange}
        onSearch={onSearch}
        data-test-subj="workflowSearchField"
      />
    </SearchBarWrapper>
  );
}
