/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';

import { styles } from './layout_sidebar.styles';

export interface LayoutSidebarProps {
  children: ReactNode;
}

/**
 * The sidebar slot wrapper
 *
 * @param props - Props for the LayoutSidebar component.
 * @returns The rendered LayoutSidebar component.
 */
export const LayoutSidebar = ({ children }: LayoutSidebarProps) => {
  return (
    <nav
      css={styles.root}
      className="kbnChromeLayoutSidebar"
      data-test-subj="kbnChromeLayoutSidebar"
    >
      {children}
    </nav>
  );
};
