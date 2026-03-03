/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { euiIncludeSelectorInFocusTrap } from '@kbn/core-chrome-layout-constants';

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
    <div
      css={styles.root}
      className="kbnChromeLayoutSidebar"
      data-test-subj="kbnChromeLayoutSidebar"
      {...euiIncludeSelectorInFocusTrap.prop}
    >
      {children}
    </div>
  );
};
