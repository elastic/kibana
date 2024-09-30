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

interface Props {
  toggleSideNav: (isVisible: boolean) => void;
  isSideNavCollapsed$: Observable<boolean>;
}

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
      css={
        isCollapsed
          ? undefined
          : { overflow: 'visible', clipPath: 'polygon(0 0, 300% 0, 300% 100%, 0 100%)' }
      }
    >
      {children}
    </EuiCollapsibleNavBeta>
  );
};
