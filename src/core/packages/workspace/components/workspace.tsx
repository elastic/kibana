/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useIsNavigationCollapsed, useIsToolboxOpen } from '@kbn/core-workspace-state';

import { EuiThemeProvider } from '@elastic/eui';
import { useIsModern } from '@kbn/core-workspace-state';
import { WorkspaceComponent, WorkspaceComponentProps } from './workspace.component';
import { WorkspaceGlobalCSS } from './workspace_global_css';

export type WorkspaceProps = Pick<WorkspaceComponentProps, 'children'>;

const WorkspaceLayout = ({ children }: WorkspaceProps) => {
  const isNavigationCollapsed = useIsNavigationCollapsed();
  const isToolboxOpen = useIsToolboxOpen();
  const isModern = useIsModern();

  const component = (
    <>
      <WorkspaceGlobalCSS />
      <WorkspaceComponent {...{ isNavigationCollapsed, isToolboxOpen }}>
        {children}
      </WorkspaceComponent>
    </>
  );

  return isModern ? <EuiThemeProvider colorMode="dark">{component}</EuiThemeProvider> : component;
};

export const Workspace = Object.assign(WorkspaceLayout, {
  Banner: WorkspaceComponent.Banner,
  Header: WorkspaceComponent.Header,
  Application: WorkspaceComponent.Application,
  Navigation: WorkspaceComponent.Navigation,
  Toolbox: WorkspaceComponent.Toolbox,
  Tool: WorkspaceComponent.Tool,
  Footer: WorkspaceComponent.Footer,
});
