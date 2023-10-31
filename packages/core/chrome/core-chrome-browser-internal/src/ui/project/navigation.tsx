/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCollapsibleNavBeta } from '@elastic/eui';
import useObservable, { type Observable } from 'react-use/lib/useObservable';

export const ProjectNavigation: React.FC<{
  isCollapsed$: Observable<boolean>;
  toggleSideNav: (isVisible: boolean) => void;
}> = ({ children, toggleSideNav, isCollapsed$ }) => {
  const isCollapsed = useObservable(isCollapsed$);

  const onCollapseToggle = (nextIsCollapsed: boolean) => {
    toggleSideNav(nextIsCollapsed);
  };

  return (
    <EuiCollapsibleNavBeta
      key={isCollapsed ? 'collapsed' : 'expanded'} // force re-render when isCollapsed changes
      data-test-subj="projectLayoutSideNav"
      initialIsCollapsed={isCollapsed}
      onCollapseToggle={onCollapseToggle}
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
