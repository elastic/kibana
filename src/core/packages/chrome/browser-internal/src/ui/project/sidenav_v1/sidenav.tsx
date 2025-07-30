/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import { EuiCollapsibleNavBeta } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { css } from '@emotion/css';
import type { NavigationProps } from './navigation';
import { Navigation } from './navigation';

export interface ProjectSideNavV1Props extends NavigationProps {
  toggle: (isVisible: boolean) => void;
  isCollapsed$: Observable<boolean>;
}

const PANEL_WIDTH = 290;

export const ProjectSideNavV1: FC<ProjectSideNavV1Props> = ({ isCollapsed$, toggle, ...rest }) => {
  return (
    <CollapsibleNavigationFlyout isCollapsed$={isCollapsed$} toggle={toggle}>
      <Navigation {...rest} isCollapsed$={isCollapsed$} />
    </CollapsibleNavigationFlyout>
  );
};

const CollapsibleNavigationFlyout = ({
  toggle,
  isCollapsed$,
  children,
}: {
  toggle: (isVisible: boolean) => void;
  isCollapsed$: Observable<boolean>;
  children: React.ReactNode;
}) => {
  const isCollapsed = useObservable(isCollapsed$, false);
  return (
    <EuiCollapsibleNavBeta
      data-test-subj="projectLayoutSideNav"
      isCollapsed={isCollapsed}
      onCollapseToggle={toggle}
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
