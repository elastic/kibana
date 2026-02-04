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

export interface Props {
  isCollapsed$: BehaviorSubject<boolean>;
  navProps: NavigationProps;
}

export const GridLayoutProjectSideNav = ({ isCollapsed$, navProps }: Props) => {
  const isCollapsed = useObservable(isCollapsed$, isCollapsed$.getValue());
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
            // have to provide this fallback to avoid bugs when EuiCollapsibleNavBeta is missing
            --euiCollapsibleNavOffset: 0px;
          }
        `}
      />
      <Navigation isCollapsed={isCollapsed} setWidth={setWidth} {...navProps} />
    </>
  );
};
