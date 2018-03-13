import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

export const LoadingState = () => (
  <EuiPanel paddingSize="l">
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <EuiTextColor color="subdued">
            <h2 style={{ textAlign: 'center' }}>Checking for Elasticsearch data</h2>
          </EuiTextColor>
        </EuiTitle>

        <EuiSpacer size="s"/>

        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l"/>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              Reticulating splines...
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
