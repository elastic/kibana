/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  closeToolbox,
  useCurrentTool,
  useIsToolboxOpen,
  useIsToolboxRight,
  useWorkspaceDispatch,
} from '@kbn/core-workspace-state';
import { useWorkspaceTools } from '@kbn/core-workspace-state';

import {
  WorkspaceToolComponent,
  type WorkspaceToolComponentProps,
} from './workspace_tool.component';
import { WorkspaceToolLoading } from './workspace_tool_loading.component';

export interface WorkspaceToolProps extends Omit<WorkspaceToolComponentProps, 'onClose'> {
  toolId?: string;
}

export const WorkspaceTool = () => {
  const isToolboxOpen = useIsToolboxOpen();
  const isRight = useIsToolboxRight();
  const currentTool = useCurrentTool();
  const tools = useWorkspaceTools();
  const dispatch = useWorkspaceDispatch();
  const onClose = () => dispatch(closeToolbox());
  const definition = tools.find((t) => t.toolId === currentTool);

  if (!definition) {
    if (isToolboxOpen) {
      return <WorkspaceToolLoading />;
    }

    return null;
  }

  const { tool } = definition;

  return <WorkspaceToolComponent {...{ onClose, isRight, ...tool }} />;
};
