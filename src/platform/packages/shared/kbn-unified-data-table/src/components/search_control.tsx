/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFieldText } from '@elastic/eui';

export interface SearchControlProps {
  uiSearchTerm: string | undefined;
  onChange: (searchTerm: string | undefined) => void;
}

export const SearchControl: React.FC<SearchControlProps> = ({ uiSearchTerm, onChange }) => {
  // TODO: needs debouncing
  const onChangeUiSearchTerm = useCallback(
    (event) => {
      const nextUiSearchTerm = event.target.value.toLowerCase();
      onChange(nextUiSearchTerm);
    },
    [onChange]
  );

  return (
    <EuiFieldText
      compressed
      placeholder="Search in the table" // TODO: i18n
      value={uiSearchTerm}
      onChange={onChangeUiSearchTerm}
    />
  );
};
