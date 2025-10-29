/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EuiFieldSearch, EuiFlexItem } from '@elastic/eui';
import * as i18n from '../../../../common/translations';

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
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value),
    [setSearchText]
  );

  useEffect(() => {
    setSearchText(initialValue);
  }, [initialValue]);

  return (
    <SearchBarWrapper grow>
      <EuiFieldSearch
        aria-label={i18n.SEARCH_WORKFLOWS}
        fullWidth
        incremental={false}
        placeholder={placeholder ?? i18n.SEARCH_PLACEHOLDER}
        value={searchText}
        onChange={handleChange}
        onSearch={onSearch}
        data-test-subj="workflowSearchField"
      />
    </SearchBarWrapper>
  );
}
