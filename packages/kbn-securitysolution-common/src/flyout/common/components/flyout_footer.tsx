/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutFooter, EuiPanel } from '@elastic/eui';

interface FlyoutFooterProps extends React.ComponentProps<typeof EuiFlyoutFooter> {
  children: React.ReactNode;
}

/**
 * Wrapper of `EuiFlyoutFooter`, setting the recommended `16px` padding using a EuiPanel.
 */
export const FlyoutFooter: FC<FlyoutFooterProps> = memo(({ children, ...flyoutFooterProps }) => {
  return (
    <EuiFlyoutFooter {...flyoutFooterProps}>
      <EuiPanel hasShadow={false} color="transparent">
        {children}
      </EuiPanel>
    </EuiFlyoutFooter>
  );
});

FlyoutFooter.displayName = 'FlyoutFooter';
