/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';

import { EuiThemeProvider, UseEuiTheme, useEuiOverflowScroll, useEuiShadow } from '@elastic/eui';
import { styles } from './workspace_application.styles';

export const WorkspaceApplication = ({
  children,
  colorMode,
}: {
  children: ReactNode;
  colorMode: UseEuiTheme['colorMode'];
}) => {
  const shadow = useEuiShadow('s');
  const overflow = useEuiOverflowScroll('y');

  return (
    <EuiThemeProvider colorMode={colorMode} wrapperProps={{ cloneElement: true }}>
      <main css={styles.root(shadow)}>
        <div css={styles.content(overflow)}>{children}</div>
      </main>
    </EuiThemeProvider>
  );
};
