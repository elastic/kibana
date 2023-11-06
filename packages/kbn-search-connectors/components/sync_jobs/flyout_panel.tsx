/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';

interface FlyoutPanelProps {
  title: string;
}

export const FlyoutPanel: React.FC<FlyoutPanelProps> = ({ children, title }) => {
  return (
    <EuiPanel paddingSize="l" color="subdued" hasShadow={false}>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer />
      {children}
    </EuiPanel>
  );
};
