/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';

import { useEuiOverflowScroll, useEuiShadow } from '@elastic/eui';
import { styles } from './workspace_application.styles';

export const WorkspaceApplication = ({ children }: { children: ReactNode }) => {
  const shadow = useEuiShadow('s');
  const overflow = useEuiOverflowScroll('y');

  return (
    <main css={styles.root(shadow)} tabIndex={0}>
      <div css={styles.content(overflow)}>{children}</div>
    </main>
  );
};
