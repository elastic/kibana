import React from 'react';

import {
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

export const Header = () => (
  <div>
    <EuiTitle size="s">
      <h3>Scripted fields</h3>
    </EuiTitle>
    <EuiText>
      <p>
        You can use scripted fields in visualizations and display them in your documents.
        However, you cannot search scripted fields.
      </p>
    </EuiText>
    <EuiSpacer size="s" />
  </div>
);
