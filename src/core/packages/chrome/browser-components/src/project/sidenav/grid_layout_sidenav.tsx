/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useObservable from 'react-use/lib/useObservable';
import { useLayoutUpdate } from '@kbn/core-chrome-layout-components';
import React, { useCallback } from 'react';
import { css, Global } from '@emotion/react';
import { useChromeComponentsDeps } from '../../context';
import { Navigation } from './navigation';

export const GridLayoutProjectSideNav = () => {
  const { basePath, application, projectNavigation, navLinks$, sideNav } =
    useChromeComponentsDeps();

  const isCollapsed = useObservable(sideNav.collapsed$, sideNav.initialCollapsed);
  const updateLayout = useLayoutUpdate();
  const setWidth = useCallback(
    (width: number) => {
      updateLayout({ navigationWidth: width });
    },
    [updateLayout]
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
        setWidth={setWidth}
        basePath={basePath}
        application={application}
        navigation$={projectNavigation.navigation$}
        navLinks$={navLinks$}
        onToggleCollapsed={sideNav.onToggleCollapsed}
      />
    </>
  );
};
