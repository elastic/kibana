import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiLoadingSpinner,
} from '@elastic/eui';

export const LoadingIndices = () => (
  <EuiFlexGroup justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="m" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText>
        <EuiTextColor color="subdued">
          Looking for matching indices...
        </EuiTextColor>
      </EuiText>
      <EuiText size="s" style={{ textAlign: 'center' }}>
        <EuiTextColor color="subdued">
          Just a sec...
        </EuiTextColor>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
