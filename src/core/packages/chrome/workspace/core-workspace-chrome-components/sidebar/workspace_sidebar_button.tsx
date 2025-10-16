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
  useWorkspaceDispatch,
  useIsSidebarOpen,
  useIsCurrentSidebarApp,
  closeSidebar,
  setSidebarWidth,
  openSidebar,
  type SidebarSize,
} from '@kbn/core-workspace-chrome-state';

import {
  WorkspaceSidebarButtonComponent,
  type WorkspaceSidebarButtonComponentProps,
} from './workspace_sidebar_button.component';

export interface WorkspaceSidebarButtonProps
  extends Omit<WorkspaceSidebarButtonComponentProps, 'onClick' | 'isOpen'> {
  appId: string;
  size?: SidebarSize;
  context?: (button: React.ReactNode) => React.ReactNode;
}

export const WorkspaceSidebarButton = ({
  appId,
  size = 'regular',
  context,
  ...props
}: WorkspaceSidebarButtonProps) => {
  const isOpen = useIsSidebarOpen();
  const isCurrent = useIsCurrentSidebarApp(appId);
  const dispatch = useWorkspaceDispatch();

  const onClick = () => {
    if (isOpen && isCurrent) {
      dispatch(closeSidebar());
    } else {
      dispatch(openSidebar(appId));
      dispatch(setSidebarWidth(size));
    }
  };

  const button = (
    <WorkspaceSidebarButtonComponent
      aria-label={appId}
      {...{ onClick, isOpen: isOpen && isCurrent, ...props }}
    />
  );

  return context ? context(button) : button;
};
