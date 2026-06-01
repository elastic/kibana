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
  // `isUserChange` distinguishes typing/Enter (we want to fire `onSearch`)
  // from prop syncs (we don't). The flag is set before calling `setSearchText`
  // and consulted inside the debounce; it's flipped back to `false` after a
  // user-driven event so the same value doesn't fire twice.
  const isUserChange = useRef(false);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    isUserChange.current = true;
    setSearchText(e.target.value);
  }, []);

  // Pressing Enter (or the native clear-X) flushes immediately and clears the
  // user-change flag so the debounce that fires for this value sees `false`
  // and skips — avoids the duplicate `onSearch` that would otherwise land
  // 300 ms after the immediate one.
  const handleImmediateSearch = useCallback((value: string) => {
    isUserChange.current = false;
    setSearchText(value);
    onSearchRef.current(value);
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
        // `incremental={false}` ties EuiFieldSearch's native `onSearch` event
        // to Enter / clear-X only. Typing is handled by the debounce above —
        // running both paths in parallel raced and defeated the debounce
        // (review feedback on the original PR).
        incremental={false}
        placeholder={placeholder ?? i18n.SEARCH_PLACEHOLDER}
        value={searchText}
        onChange={handleChange}
        onSearch={handleImmediateSearch}
        data-test-subj="workflowSearchField"
      />
    </SearchBarWrapper>
  );
}
