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
import { euiIncludeSelectorInFocusTrap } from '@kbn/ui-chrome-layout-constants';

import { useLayoutConfig } from '../layout_config_context';
import { styles } from './layout_agent.styles';

export interface LayoutAgentProps {
  children: ReactNode;
}

/**
 * The agent workspace slot wrapper — a peer app workspace column for Agent Builder.
 */
export const LayoutAgent = ({ children }: LayoutAgentProps) => {
  const { chromeStyle } = useLayoutConfig();

  return (
    <div
      css={styles.root(chromeStyle)}
      className="kbnChromeLayoutAgent"
      data-test-subj="kbnChromeLayoutAgent"
      {...euiIncludeSelectorInFocusTrap.prop}
    >
      <div css={styles.content}>{children}</div>
    </div>
  );
};
