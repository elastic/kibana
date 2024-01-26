/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import { EuiCollapsibleNavBeta } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const LOCAL_STORAGE_IS_COLLAPSED_KEY = 'PROJECT_NAVIGATION_COLLAPSED' as const;

export const ProjectNavigation: React.FC<{
  toggleSideNav: (isVisible: boolean) => void;
}> = ({ children, toggleSideNav }) => {
  const isMounted = useRef(false);
  const [isCollapsed, setIsCollapsed] = useLocalStorage(LOCAL_STORAGE_IS_COLLAPSED_KEY, false);
  const onCollapseToggle = (nextIsCollapsed: boolean) => {
    setIsCollapsed(nextIsCollapsed);
    toggleSideNav(nextIsCollapsed);
  };

  useEffect(() => {
    if (!isMounted.current && isCollapsed !== undefined) {
      toggleSideNav(isCollapsed);
    }
    isMounted.current = true;
  }, [isCollapsed, toggleSideNav]);

  return (
    <EuiCollapsibleNavBeta
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
