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
import { AGENT_MAIN_CONTAINER_ID } from '../constants';
import { useLayoutConfig } from '../layout_config_context';
import { styles } from './layout_agent.styles';

export interface LayoutAgentProps {
  children: ReactNode;
}

/**
 * Agent workspace slot — a peer column beside the application workspace.
 */
export const LayoutAgent = ({ children }: LayoutAgentProps) => {
  const { appearance, agentWorkspaceOpen = true } = useLayoutConfig();

  return (
    <div
      id={AGENT_MAIN_CONTAINER_ID}
      css={[styles.shell(appearance), !agentWorkspaceOpen && styles.closed]}
      className="kbnChromeLayoutAgent"
      aria-hidden={!agentWorkspaceOpen}
    >
      <div css={styles.scrollContainer} data-test-subj="kbnChromeLayoutAgent" tabIndex={-1}>
        <div css={styles.content}>{children}</div>
      </div>
    </div>
  );
};
