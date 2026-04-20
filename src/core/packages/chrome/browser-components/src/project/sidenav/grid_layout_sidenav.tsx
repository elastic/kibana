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
import { Navigation } from './navigation';
import { useAutoCollapse } from './use_auto_collapse';

function useSideNavSetWidth(): (width: number) => void {
  const chrome = useChromeService();
  return useCallback((width: number) => chrome.sideNav.setWidth(width), [chrome]);
}

export const GridLayoutProjectSideNav = () => {
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
        // Hide the toggle button when the viewport forces collapse — the user
        // cannot override it, so showing an unresponsive "expand" button would
        // be confusing. Navigation omits the button when this prop is undefined.
        onToggleCollapsed={isAutoCollapsed ? undefined : onToggleCollapsed}
      />
    </>
  );
};
