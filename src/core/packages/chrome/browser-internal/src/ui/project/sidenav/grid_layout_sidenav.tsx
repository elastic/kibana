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
import type { BehaviorSubject } from 'rxjs';
import { css, Global } from '@emotion/react';
import { Navigation } from './navigation';
import type { NavigationProps } from './types';
import { SideNavCollapseButton } from './collapse_button';

export interface Props {
  isCollapsed$: BehaviorSubject<boolean>;
  toggle: (isCollapsed: boolean) => void;
  navProps: NavigationProps;
}

export const GridLayoutProjectSideNav = ({ isCollapsed$, toggle, navProps }: Props) => {
  const isCollapsed = useObservable(isCollapsed$, isCollapsed$.getValue());
  const updateLayout = useLayoutUpdate();
  const setWidth = useCallback(
    (width: number, metadata: { isSidePanelOpen: boolean }) => {
      // add gap spacing if we are using the secondary navigation panel, because that panel has the same background color as the app space
      const finalWidth = metadata.isSidePanelOpen ? width + 8 : width;
      updateLayout({ navigationWidth: finalWidth });
    },
    [updateLayout]
  );

  return (
    <>
      <Global
        styles={css`
          :root {
            // have to provide this fallback to avoid bugs when EuiCollapsibleNavBeta is missing
            --euiCollapsibleNavOffset: 0px;
          }
        `}
      />
      <Navigation
        isCollapsed={isCollapsed}
        setWidth={setWidth}
        collapseButton={<SideNavCollapseButton isCollapsed={isCollapsed} toggle={toggle} />}
        {...navProps}
      />
    </>
  );
};
