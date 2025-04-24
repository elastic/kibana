/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import { Workspace, WorkspaceToolbarButton } from '@kbn/core-workspace-components';
import { WORKSPACE_TOOL_PROFILE, type WorkspaceService } from '@kbn/core-chrome-browser';
import { WorkspaceProvider, useIsSearchInToolbar } from '@kbn/core-workspace-state';

import { css } from '@emotion/react';
import { KibanaActionMenuMount, KibanaActionMenuMountProps } from './kibana_action_menu_mount';
import { KibanaSideNavProps, KibanaSideNavigation } from './kibana_side_navigation';
import { useDistinctObservable } from './use_distinct_observable';
import { WorkspaceToolbarSearchButton } from './tools';
import { KibanaWorkspaceHeaderLogo } from './header/workspace_header_logo';
import { KibanaWorkspaceHeader } from './header/workspace_header';

export interface KibanaWorkspaceProps extends KibanaSideNavProps, KibanaActionMenuMountProps {
  children: React.ReactNode;
  workspace: WorkspaceService;
}

const Component = ({
  children: application,
  workspace,
  currentActionMenu$,
  getActiveNodes$,
  getProjectSideNavComponent$,
}: KibanaWorkspaceProps) => {
  const {
    header: { getBreadcrumbs$ },
  } = workspace;
  const { colorMode, euiTheme } = useEuiTheme();

  // TODO: clintandrewhall - All of this needs to GO AWAY.  Observables should not be props.
  const tools = useDistinctObservable(workspace.toolbar.getTools$(), []);
  const breadcrumbs = useDistinctObservable(getBreadcrumbs$(), []);
  const isSearchInToolbar = useIsSearchInToolbar();
  const search = workspace.toolbar.getSearchControl();
  const actionMenu = <KibanaActionMenuMount {...{ currentActionMenu$ }} />;
  const sideNav = <KibanaSideNavigation {...{ getActiveNodes$, getProjectSideNavComponent$ }} />;
  const logo = <KibanaWorkspaceHeaderLogo />;

  const searchButton = search ? (
    <EuiFlexItem key="search" grow={false}>
      <WorkspaceToolbarSearchButton key="search">{search}</WorkspaceToolbarSearchButton>
    </EuiFlexItem>
  ) : null;

  return (
    <WorkspaceProvider {...{ tools }}>
      <Workspace>
        {{
          header: (
            <Workspace.Header>
              <KibanaWorkspaceHeader {...{ breadcrumbs, logo }}>
                <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
                  <EuiFlexItem>{actionMenu}</EuiFlexItem>
                  {isSearchInToolbar ? null : <EuiFlexItem>{searchButton}</EuiFlexItem>}
                </EuiFlexGroup>
              </KibanaWorkspaceHeader>
            </Workspace.Header>
          ),
          application: (
            <Workspace.Application colorMode={colorMode}>{application}</Workspace.Application>
          ),
          navigation: <Workspace.Navigation>{sideNav}</Workspace.Navigation>,
          toolbar: (
            <Workspace.Toolbar>
              <EuiFlexGroup
                direction="column"
                gutterSize="m"
                css={css`
                  margin: ${euiTheme.size.s} 0;
                `}
              >
                {tools.map(({ toolId, button, size }) => (
                  <>
                    <EuiFlexItem key={toolId} grow={false}>
                      <WorkspaceToolbarButton key={toolId} {...{ toolId, size, ...button }} />
                    </EuiFlexItem>
                    {isSearchInToolbar && toolId === WORKSPACE_TOOL_PROFILE && searchButton}
                  </>
                ))}
              </EuiFlexGroup>
            </Workspace.Toolbar>
          ),
          tool: <Workspace.Tool />,
        }}
      </Workspace>
    </WorkspaceProvider>
  );
};

export const KibanaWorkspace = ({ workspace, ...props }: Omit<KibanaWorkspaceProps, 'tools'>) => {
  const WorkspaceStateProvider = workspace.getStateProvider();

  return (
    <WorkspaceStateProvider>
      <Component {...{ ...props, workspace }} />
    </WorkspaceStateProvider>
  );
};
