import React from 'react';
import {
  KuiFormRow,
  KuiIcon,
  KuiFlexGroup,
  KuiFlexItem,
} from 'ui_framework/components';

import { InputPatternInputField } from './lib/index-pattern-input-field';

const IndexPatternSearch = ({
  hasExactMatches,
  fetchIndices,
}) => {
  return (
    <KuiFormRow
      helpText="Patterns allow you to define dynamic index names using * as a wildcard"
    >
      <KuiFlexGroup>
        <KuiFlexItem>
          <InputPatternInputField
            placeholder="Please enter..."
            onChange={fetchIndices}
            name="pattern"
          />
        </KuiFlexItem>
        <KuiFlexItem grow={false}>
          <KuiIcon
            type={hasExactMatches ? 'check' : 'cross'}
            size="medium"
          />
        </KuiFlexItem>
      </KuiFlexGroup>
    </KuiFormRow>
  );
};

export { IndexPatternSearch };
