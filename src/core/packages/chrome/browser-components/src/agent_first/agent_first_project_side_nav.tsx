/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { css, Global } from '@emotion/react';
import { useSideNavCollapsed, useSidebarWidth } from '@kbn/core-chrome-browser-hooks';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { Navigation } from '../project/sidenav/navigation';
import { useAutoCollapse } from '../project/sidenav/use_auto_collapse';
import { AgentFirstNavTopControls } from './agent_first_nav_top_controls';

function useSideNavSetWidth(): (width: number) => void {
  const chrome = useChromeService();
  return useCallback((width: number) => chrome.sideNav.setWidth(width), [chrome]);
}

export const AgentFirstProjectSideNav = () => {
  const { isCollapsed, setIsCollapsed: onToggleCollapsed } = useSideNavCollapsed();
  const setWidth = useSideNavSetWidth();
  const sidebarWidth = useSidebarWidth();
  const isAutoCollapsed = useAutoCollapse(sidebarWidth);

  return (
    <>
      <Global
        styles={css`
          :root {
            --euiCollapsibleNavOffset: 0px;
          }
        `}
      />
      <Navigation
        isCollapsed={isCollapsed || isAutoCollapsed}
        setWidth={setWidth}
        onToggleCollapsed={isAutoCollapsed ? undefined : onToggleCollapsed}
        navTopControls={<AgentFirstNavTopControls />}
        showTopSeparator={false}
      />
    </>
  );
};
