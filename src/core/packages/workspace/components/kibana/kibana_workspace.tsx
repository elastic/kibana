/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { WORKSPACE_TOOL_PROFILE, type WorkspaceService } from '@kbn/core-chrome-browser';
import { WorkspaceProvider, useIsSearchInToolbox } from '@kbn/core-workspace-state';

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { Workspace } from '../workspace';
import { KibanaActionMenuMount, KibanaActionMenuMountProps } from './kibana_action_menu_mount';
import { WorkspaceHeaderLogo } from '../header/workspace_header_logo';
import { KibanaSideNavProps, KibanaSideNavigation } from './kibana_side_navigation';
import { useDistinctObservable } from './use_distinct_observable';
import { WorkspaceToolboxButton } from '../toolbox';
import { WorkspaceToolboxSearchButton } from '../toolbox/workspace_toolbox_search_button';

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
  const { colorMode } = useEuiTheme();

  // TODO: clintandrewhall - All of this needs to GO AWAY.  Observables should not be props.
  const tools = useDistinctObservable(workspace.toolbox.getTools$(), []);
  const breadcrumbs = useDistinctObservable(getBreadcrumbs$(), []);
  const isSearchInToolbox = useIsSearchInToolbox();
  const search = workspace.toolbox.getSearchControl();
  const actionMenu = <KibanaActionMenuMount {...{ currentActionMenu$ }} />;
  const sideNav = <KibanaSideNavigation {...{ getActiveNodes$, getProjectSideNavComponent$ }} />;
  const logo = <WorkspaceHeaderLogo />;
  const banner = useDistinctObservable(workspace.banner.getBanner$(), null);

  const searchButton = search ? (
    <EuiFlexItem key="search" grow={false}>
      <WorkspaceToolboxSearchButton key="search">{search}</WorkspaceToolboxSearchButton>
    </EuiFlexItem>
  ) : null;

  return (
    <WorkspaceProvider {...{ tools }}>
      <Workspace>
        {{
          banner: banner ? <Workspace.Banner>{banner}</Workspace.Banner> : undefined,
          header: (
            <Workspace.Header {...{ breadcrumbs, logo }}>
              <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
                <EuiFlexItem>{actionMenu}</EuiFlexItem>
                {isSearchInToolbox ? null : <EuiFlexItem>{searchButton}</EuiFlexItem>}
              </EuiFlexGroup>
            </Workspace.Header>
          ),
          application: (
            <Workspace.Application colorMode={colorMode}>{application}</Workspace.Application>
          ),
          navigation: <Workspace.Navigation>{sideNav}</Workspace.Navigation>,
          toolbox: (
            <Workspace.Toolbox>
              <EuiFlexGroup direction="column" gutterSize="m">
                {tools.map(({ toolId, button, size }) => (
                  <>
                    <EuiFlexItem key={toolId} grow={false}>
                      <WorkspaceToolboxButton key={toolId} {...{ toolId, size, ...button }} />
                    </EuiFlexItem>
                    {isSearchInToolbox && toolId === WORKSPACE_TOOL_PROFILE && searchButton}
                  </>
                ))}
              </EuiFlexGroup>
            </Workspace.Toolbox>
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
