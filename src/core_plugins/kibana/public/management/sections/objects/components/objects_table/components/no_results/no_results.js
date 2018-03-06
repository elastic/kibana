import React from 'react';

import {
  EuiTitle,
  EuiTextColor,
  EuiSpacer,
} from '@elastic/eui';

export const NoResults = ({
  currentTab,
}) => (
  <div>
    <EuiSpacer size="m"/>
    <EuiTitle>
      <EuiTextColor color="subdued">
        <h3 style={{ textAlign: 'center' }}>No {currentTab.name.toLowerCase()} matched your search.</h3>
      </EuiTextColor>
    </EuiTitle>
  </div>
);
