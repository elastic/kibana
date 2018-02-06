import React from 'react';

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiTextColor,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui';

export const LoadingState = ({

}) => (
  <EuiPanel paddingSize="l">
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <EuiTextColor color="subdued">
            <h2 style={{ textAlign: 'center' }}>Checking for Elasticsearch data</h2>
          </EuiTextColor>
        </EuiTitle>
        <EuiSpacer size="s"/>
        <EuiText size="s">
          <p style={{ textAlign: 'center' }}>
            <EuiIcon type="faceSad"/>
            <EuiTextColor color="subdued">
              Reticulating splines...
            </EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
