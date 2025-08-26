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

import { styles } from './layout_footer.styles';

export interface LayoutFooterProps {
  children: ReactNode;
}

/**
 * The footer slot wrapper
 *
 * @param props - Props for the LayoutFooter component.
 * @returns The rendered LayoutFooter component.
 */
export const LayoutFooter = ({ children }: LayoutFooterProps) => {
  return (
    <footer
      css={styles.root}
      className="kbnChromeLayoutFooter"
      data-test-subj="kbnChromeLayoutFooter"
    >
      {children}
    </footer>
  );
};
