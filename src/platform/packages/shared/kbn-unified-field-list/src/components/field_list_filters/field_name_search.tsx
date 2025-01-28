/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch, type EuiFieldSearchProps } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/visualization-utils';

/**
 * Props for FieldNameSearch component
 */
export interface FieldNameSearchProps {
  'data-test-subj': string;
  append?: EuiFieldSearchProps['append'];
  compressed?: EuiFieldSearchProps['compressed'];
  nameFilter: string;
  screenReaderDescriptionId?: string;
  onChange: (nameFilter: string) => unknown;
}

/**
 * Search input for fields list
 * @param dataTestSubject
 * @param append
 * @param compressed
 * @param nameFilter
 * @param screenReaderDescriptionId
 * @param onChange
 * @constructor
 */
export const FieldNameSearch: React.FC<FieldNameSearchProps> = ({
  'data-test-subj': dataTestSubject,
  append,
  compressed,
  nameFilter,
  screenReaderDescriptionId,
  onChange,
}) => {
  const searchPlaceholder = i18n.translate('unifiedFieldList.fieldNameSearch.filterByNameLabel', {
    defaultMessage: 'Search field names',
    description: 'Search the list of fields in the data view for the provided text',
  });

  const { inputValue, handleInputChange } = useDebouncedValue({
    onChange,
    value: nameFilter,
  });

  return (
    <EuiFieldSearch
      aria-describedby={screenReaderDescriptionId}
      aria-label={searchPlaceholder}
      data-test-subj={`${dataTestSubject}FieldSearch`}
      fullWidth
      onChange={(e) => {
        handleInputChange(e.target.value);
      }}
      placeholder={searchPlaceholder}
      value={inputValue}
      append={append}
      compressed={compressed}
    />
  );
};
