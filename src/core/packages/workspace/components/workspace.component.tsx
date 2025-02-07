/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Global } from '@emotion/react';

import { WorkspaceHeaderComponent as Header } from './workspace_header.component';
import { WorkspaceBannerComponent as Banner } from './workspace_banner.component';
import { WorkspaceNavigationComponent as Navigation } from './workspace_navigation.component';
import { WorkspaceApplicationComponent as Application } from './workspace_application.component';
import { WorkspaceToolboxComponent as Toolbox } from './workspace_toolbox.component';
import { WorkspaceTool as Tool } from './workspace_tool';
import { WorkspaceFooterComponent as Footer } from './workspace_footer.component';

import { useWorkspaceStyles } from './workspace.styles';

export interface WorkspaceComponentProps {
  isNavigationOpen: boolean;
  isToolboxOpen: boolean;
  toolboxWidth?: 'regular' | 'wide' | 'fullWidth';
  children: {
    banner?: () => JSX.Element;
    header: () => JSX.Element;
    navigation: () => JSX.Element;
    application: () => JSX.Element;
    toolbox: () => JSX.Element;
    tool: () => JSX.Element;
    footer?: () => JSX.Element;
  };
}

const Workspace = ({
  children: { banner: bannerFn, header, navigation, application, toolbox, tool, footer: footerFn },
  ...props
}: WorkspaceComponentProps) => {
  const styles = useWorkspaceStyles();

  const banner = bannerFn ? (
    <WorkspaceComponent.Banner>{bannerFn()}</WorkspaceComponent.Banner>
  ) : null;
  const footer = footerFn ? (
    <WorkspaceComponent.Footer>{footerFn()}</WorkspaceComponent.Footer>
  ) : null;

  return (
    <>
      <Global styles={styles.global({ ...props, hasBanner: !!banner, hasFooter: !!footer })} />
      <div css={styles.workspace}>
        {banner}
        <WorkspaceComponent.Header>{header()}</WorkspaceComponent.Header>
        <WorkspaceComponent.Application>{application()}</WorkspaceComponent.Application>
        <WorkspaceComponent.Navigation>{navigation()}</WorkspaceComponent.Navigation>
        <WorkspaceComponent.Toolbox>{toolbox()}</WorkspaceComponent.Toolbox>
        <WorkspaceComponent.Tool>{tool()}</WorkspaceComponent.Tool>
        {footer}
      </div>
    </>
  );
};

export const WorkspaceComponent = Object.assign(Workspace, {
  Banner,
  Header,
  Navigation,
  Application,
  Toolbox,
  Tool,
  Footer,
});
