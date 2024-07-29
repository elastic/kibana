/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutHeader, EuiPanel } from '@elastic/eui';

interface FlyoutHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  children: React.ReactNode;
}

/**
 * Wrapper of `EuiFlyoutHeader`, setting the recommended `16px` padding using a EuiPanel.
 */
export const FlyoutHeader: FC<FlyoutHeaderProps> = memo(({ children, ...flyoutHeaderProps }) => {
  return (
    <EuiFlyoutHeader hasBorder {...flyoutHeaderProps}>
      <EuiPanel hasShadow={false} color="transparent">
        {children}
      </EuiPanel>
    </EuiFlyoutHeader>
  );
});

FlyoutHeader.displayName = 'FlyoutHeader';
