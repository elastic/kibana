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
import { css } from '@emotion/react';
import { AgentWorkspaceResizeHandle } from './agent_workspace_resize_handle';

const wrapperStyles = css`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  min-height: 0;
  min-width: 0;
`;

const contentStyles = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  min-width: 0;
`;

export interface AgentWorkspacePanelProps {
  width: number;
  navigationWidth: number;
  sidebarWidth: number;
  onWidthChange: (width: number) => void;
  children: ReactNode;
}

/**
 * Agent workspace shell with a drag resize handle on the application-facing (right) edge.
 * The application workspace always fills the remaining grid column.
 */
export function AgentWorkspacePanel({
  width,
  navigationWidth,
  sidebarWidth,
  onWidthChange,
  children,
}: AgentWorkspacePanelProps) {
  return (
    <div css={wrapperStyles} data-test-subj="agentWorkspacePanel">
      <div css={contentStyles}>{children}</div>
      <AgentWorkspaceResizeHandle
        width={width}
        navigationWidth={navigationWidth}
        sidebarWidth={sidebarWidth}
        onWidthChange={onWidthChange}
      />
    </div>
  );
}
