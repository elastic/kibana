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
  useIsNavigationCollapsed,
  setIsNavigationCollapsed,
  useWorkspaceDispatch,
} from '@kbn/core-workspace-chrome-state';
import { WorkspaceNavControlComponent } from './workspace_nav_control.component';

export {
  WorkspaceNavControlComponent,
  type WorkspaceNavControlComponentProps,
} from './workspace_nav_control.component';

export const WorkspaceNavControl = () => {
  const isNavigationCollapsed = useIsNavigationCollapsed();
  const dispatch = useWorkspaceDispatch();

  const onNavigationToggle = (isCollapsed: boolean) => {
    dispatch(setIsNavigationCollapsed(isCollapsed));
  };

  return <WorkspaceNavControlComponent {...{ isNavigationCollapsed, onNavigationToggle }} />;
};
