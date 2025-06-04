/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { styles } from './layout_navigation.styles';

export interface LayoutNavigationProps {
  children: ReactNode;
  width: number;
}

export const LayoutNavigation = ({ children, width }: LayoutNavigationProps) => {
  return (
    <nav css={styles.root} style={{ width }}>
      {children}
    </nav>
  );
};
