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
import { WorkspaceProvider } from '@kbn/core-workspace-state';

import { useEuiTheme } from '@elastic/eui';
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

export const KibanaWorkspace = ({
  children: application,
  workspace,
  currentActionMenu$,
  getActiveNodes$,
  getProjectSideNavComponent$,
}: KibanaWorkspaceProps) => {
  const {
    header: { getBreadcrumbs$ },
  } = workspace;

  // TODO: clintandrewhall - All of this needs to GO AWAY.  Observables should not be props.
  const breadcrumbs = useDistinctObservable(getBreadcrumbs$(), []);
  const tools = useDistinctObservable(workspace.toolbox.getTools$(), []);
  const search = workspace.toolbox.getSearchControl();
  const actionMenu = <KibanaActionMenuMount {...{ currentActionMenu$ }} />;
  const sideNav = <KibanaSideNavigation {...{ getActiveNodes$, getProjectSideNavComponent$ }} />;

  const logo = <WorkspaceHeaderLogo />;
  const { colorMode } = useEuiTheme();

  return (
    <WorkspaceProvider tools={tools}>
      <Workspace>
        {{
          header: <Workspace.Header {...{ breadcrumbs, logo }}>{actionMenu}</Workspace.Header>,
          application: (
            <Workspace.Application colorMode={colorMode}>{application}</Workspace.Application>
          ),
          navigation: <Workspace.Navigation>{sideNav}</Workspace.Navigation>,
          toolbox: (
            <Workspace.Toolbox>
              {tools.map(({ toolId, button, size }) => (
                <>
                  <WorkspaceToolboxButton key={toolId} {...{ toolId, size, ...button }} />
                  {toolId === WORKSPACE_TOOL_PROFILE && search && (
                    <WorkspaceToolboxSearchButton key="search">
                      {search}
                    </WorkspaceToolboxSearchButton>
                  )}
                </>
              ))}
            </Workspace.Toolbox>
          ),
          tool: <Workspace.Tool />,
        }}
      </Workspace>
    </WorkspaceProvider>
  );
};
