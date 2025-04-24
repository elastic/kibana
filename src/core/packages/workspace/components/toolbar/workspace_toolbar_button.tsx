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
  useIsToolbarOpen,
  useWorkspaceDispatch,
  closeToolbar,
  openToolbar,
  useIsCurrentTool,
  ToolbarSize,
  setToolbarSize,
} from '@kbn/core-workspace-state';
import {
  WorkspaceToolbarButtonComponent,
  type WorkspaceToolbarButtonComponentProps,
} from './workspace_toolbar_button.component';

export interface WorkspaceToolbarButtonProps
  extends Omit<WorkspaceToolbarButtonComponentProps, 'onClick' | 'isOpen'> {
  toolId: string;
  size?: ToolbarSize;
}

export const WorkspaceToolbarButton = ({
  toolId: id,
  size = 'regular',
  ...props
}: WorkspaceToolbarButtonProps) => {
  const isOpen = useIsToolbarOpen();
  const isCurrent = useIsCurrentTool(id);
  const dispatch = useWorkspaceDispatch();

  const onClick = () => {
    if (isOpen && isCurrent) {
      dispatch(closeToolbar());
    } else {
      dispatch(openToolbar(id));
      dispatch(setToolbarSize(size));
    }
  };

  return (
    <WorkspaceToolbarButtonComponent
      aria-label={id}
      {...{ onClick, isOpen: isOpen && isCurrent, ...props }}
    />
  );
};
