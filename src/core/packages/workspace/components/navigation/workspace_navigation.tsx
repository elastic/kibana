/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useIsNavigationCollapsed } from '@kbn/core-workspace-state';
import { WorkspaceNavigationComponent } from './workspace_navigation.component';

export interface WorkspaceNavigationProps {
  children: React.ReactNode;
}

export const WorkspaceNavigation = ({ children }: WorkspaceNavigationProps) => {
  const isCollapsed = useIsNavigationCollapsed();

  return (
    <WorkspaceNavigationComponent {...{ isCollapsed }}>{children}</WorkspaceNavigationComponent>
  );
};
