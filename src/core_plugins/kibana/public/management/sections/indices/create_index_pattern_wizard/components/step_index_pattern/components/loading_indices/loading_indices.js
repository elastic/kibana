import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

export const LoadingIndices = () => (
  <EuiFlexGroup justifyContent="center">
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
