/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { makeRegEx } from '@kbn/kibana-utils-plugin/common';
import { EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiButton } from '@elastic/eui';

interface AddFilterProps {
  onAddFilter: (filter: string) => void;
}

const sourcePlaceholder = i18n.translate(
  'indexPatternManagement.editIndexPattern.sourcePlaceholder',
  {
    defaultMessage:
      "field filter, accepts wildcards (e.g., `user*` to filter fields starting with 'user')",
  }
);

export const AddFilter = ({ onAddFilter }: AddFilterProps) => {
  const [filter, setFilter] = useState<string>('');
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  const onAddButtonClick = useCallback(() => {
    onAddFilter(filter);
    setFilter('');
  }, [filter, onAddFilter]);

  const validateFilter = useCallback((value: string) => {
    if (value.length === 0) {
      setIsInvalid(true);
      return;
    }

    try {
      // test value is not important, just that the created regex is able to compile
      makeRegEx(value).test('');
      setIsInvalid(false);
    } catch (_) {
      setIsInvalid(true);
      return;
    }
  }, []);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={10}>
        <EuiFieldText
          fullWidth
          value={filter}
          data-test-subj="fieldFilterInput"
          isInvalid={isInvalid}
          onBlur={(e) => validateFilter(e.target.value.trim())}
          onChange={(e) => setFilter(e.target.value.trim())}
          placeholder={sourcePlaceholder}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          data-test-subj="addFieldFilterButton"
          isDisabled={filter.length === 0 || isInvalid}
          onClick={onAddButtonClick}
        >
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.source.addButtonLabel"
            defaultMessage="Add"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
