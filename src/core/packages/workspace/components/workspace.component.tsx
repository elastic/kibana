/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { WorkspaceHeader as Header, WorkspaceBanner as Banner } from './header';
import { WorkspaceNavigation as Navigation } from './navigation';
import { WorkspaceApplication as Application } from './application';
import { WorkspaceToolbox as Toolbox, WorkspaceTool as Tool } from './toolbox';
import { WorkspaceFooter as Footer } from './footer';

import { useWorkspaceStyles } from './workspace.styles';

export interface WorkspaceComponentProps {
  children: {
    application: ReturnType<typeof Application>;
    banner?: ReturnType<typeof Banner>;
    navigation: ReturnType<typeof Navigation>;
    footer?: ReturnType<typeof Footer>;
    header: ReturnType<typeof Header>;
    tool: ReturnType<typeof Tool>;
    toolbox: ReturnType<typeof Toolbox>;
  };
}

const Workspace = ({
  children: { application, banner, footer, navigation, header, tool, toolbox },
}: WorkspaceComponentProps) => {
  const styles = useWorkspaceStyles();

  return (
    <>
      <div css={styles.workspace}>
        {banner}
        {header}
        {navigation}
        {application}
        {toolbox}
        {tool}
        {footer}
      </div>
    </>
  );
};

export const WorkspaceComponent = Object.assign(Workspace, {
  Banner,
  Header,
  Application,
  Navigation,
  Toolbox,
  Tool,
  Footer,
});
