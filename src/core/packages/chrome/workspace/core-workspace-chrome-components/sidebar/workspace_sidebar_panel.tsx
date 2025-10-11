/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { WorkspaceSidebarApp } from '@kbn/core-workspace-chrome-state';
import {
  useIsSidebarOpen,
  useCurrentSidebarApp,
  closeSidebar,
  useWorkspaceDispatch,
} from '@kbn/core-workspace-chrome-state';

import {
  WorkspaceSidebarPanelComponent,
  type WorkspaceSidebarPanelComponentProps,
} from './workspace_sidebar_panel.component';

import { WorkspaceSidebarPanelLoading } from './panel_loading';

export interface WorkspaceSidebarPanelProps
  extends Omit<WorkspaceSidebarPanelComponentProps, 'onClose' | 'title' | 'children'> {
  apps: WorkspaceSidebarApp[];
}

export const WorkspaceSidebarPanel = ({ apps }: WorkspaceSidebarPanelProps) => {
  const isSidebarOpen = useIsSidebarOpen();
  const currentApp = useCurrentSidebarApp();
  const dispatch = useWorkspaceDispatch();
  const onClose = () => dispatch(closeSidebar());
  const definition = apps.find((t) => t.appId === currentApp);

  if (!definition) {
    if (isSidebarOpen) {
      return <WorkspaceSidebarPanelLoading />;
    }

    return null;
  }

  const { app } = definition;

  return <WorkspaceSidebarPanelComponent {...{ onClose, ...app }} />;
};
