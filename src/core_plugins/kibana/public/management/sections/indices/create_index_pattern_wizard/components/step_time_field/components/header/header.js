import React from 'react';

import {
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

export const Header = ({
  indexPattern,
}) => (
  <div>
    <EuiTitle size="s">
      <h2>
        Step 2 of 2: Configure settings
      </h2>
    </EuiTitle>
    <EuiSpacer size="m"/>
    <EuiText color="subdued">
      <span>
        You&apos;ve defined <strong>{indexPattern}</strong> as your index pattern.
        Now you can specify some settings before we create it.
      </span>
    </EuiText>
  </div>
);
