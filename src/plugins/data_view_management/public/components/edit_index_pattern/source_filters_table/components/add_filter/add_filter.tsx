/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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

  const onAddButtonClick = useCallback(() => {
    onAddFilter(filter);
    setFilter('');
  }, [filter, onAddFilter]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={10}>
        <EuiFieldText
          fullWidth
          value={filter}
          onChange={(e) => setFilter(e.target.value.trim())}
          placeholder={sourcePlaceholder}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton isDisabled={filter.length === 0} onClick={onAddButtonClick}>
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.source.addButtonLabel"
            defaultMessage="Add"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
