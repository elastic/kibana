/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { css, Global } from '@emotion/react';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useSideNavCollapsed } from '@kbn/core-chrome-browser-hooks';
import { Navigation } from './navigation';

export const GridLayoutProjectSideNav = () => {
  const chrome = useChromeService();
  const { isCollapsed, setIsCollapsed: onToggleCollapsed } = useSideNavCollapsed();
  const setWidth = useCallback((width: number) => chrome.sideNav.setWidth(width), [chrome]);
  const responsive = useMemo(
    () => ({
      mode: 'containerWidth' as const,
      getContainer: () => document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID),
      collapseAtWidth: 1000,
      expandAtWidth: 1100,
    }),
    []
  );

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
        isCollapsed={isCollapsed}
        responsive={responsive}
        setWidth={setWidth}
        onToggleCollapsed={onToggleCollapsed}
      />
    </>
  );
};
