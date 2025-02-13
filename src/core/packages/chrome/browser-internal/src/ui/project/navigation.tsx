/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiCollapsibleNavBeta } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { css } from '@emotion/css';

interface Props {
  toggleSideNav: (isVisible: boolean) => void;
  isSideNavCollapsed$: Observable<boolean>;
}

const PANEL_WIDTH = 290;

export const ProjectNavigation: FC<PropsWithChildren<Props>> = ({
  children,
  isSideNavCollapsed$,
  toggleSideNav,
}) => {
  const isCollapsed = useObservable(isSideNavCollapsed$, false);

  return (
    <EuiCollapsibleNavBeta
      data-test-subj="projectLayoutSideNav"
      isCollapsed={isCollapsed}
      onCollapseToggle={toggleSideNav}
      css={{
        overflow: 'visible',
        clipPath: `polygon(0 0, calc(var(--euiCollapsibleNavOffset) + ${PANEL_WIDTH}px) 0, calc(var(--euiCollapsibleNavOffset) + ${PANEL_WIDTH}px) 100%, 0 100%)`,
      }}
      className={css`
        .euiFlyoutBody__overflowContent {
          height: 100%;
        }
      `}
    >
      {children}
    </EuiCollapsibleNavBeta>
  );
};
