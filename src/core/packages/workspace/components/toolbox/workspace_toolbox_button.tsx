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
  useIsToolboxOpen,
  useWorkspaceDispatch,
  closeToolbox,
  openToolbox,
  useIsCurrentTool,
  ToolboxSize,
  setToolboxSize,
} from '@kbn/core-workspace-state';
import {
  WorkspaceToolboxButtonComponent,
  type WorkspaceToolboxButtonComponentProps,
} from './workspace_toolbox_button.component';

export interface WorkspaceToolboxButtonProps
  extends Omit<WorkspaceToolboxButtonComponentProps, 'onClick' | 'isOpen'> {
  toolId: string;
  size?: ToolboxSize;
}

export const WorkspaceToolboxButton = ({
  toolId: id,
  size = 'regular',
  ...props
}: WorkspaceToolboxButtonProps) => {
  const isOpen = useIsToolboxOpen();
  const isCurrent = useIsCurrentTool(id);
  const dispatch = useWorkspaceDispatch();

  const onClick = () => {
    if (isOpen && isCurrent) {
      dispatch(closeToolbox());
    } else {
      dispatch(openToolbox(id));
      dispatch(setToolboxSize(size));
    }
  };

  return (
    <WorkspaceToolboxButtonComponent
      aria-label={id}
      {...{ onClick, isOpen: isOpen && isCurrent, ...props }}
    />
  );
};
