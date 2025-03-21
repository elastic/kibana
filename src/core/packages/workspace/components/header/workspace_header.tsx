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
  setIsNavigationCollapsed,
  useIsNavigationCollapsed,
  useWorkspaceDispatch,
} from '@kbn/core-workspace-state';
import {
  WorkspaceHeaderComponent,
  WorkspaceHeaderComponentProps,
} from './workspace_header.component';

export type WorkspaceHeaderProps = Pick<
  WorkspaceHeaderComponentProps,
  'logo' | 'breadcrumbs' | 'children'
>;

export const WorkspaceHeader = (props: WorkspaceHeaderProps) => {
  const isNavigationCollapsed = useIsNavigationCollapsed();
  const dispatch = useWorkspaceDispatch();
  const onNavigationToggle = () => {
    dispatch(setIsNavigationCollapsed(!isNavigationCollapsed));
  };

  return <WorkspaceHeaderComponent {...{ isNavigationCollapsed, onNavigationToggle, ...props }} />;
};
