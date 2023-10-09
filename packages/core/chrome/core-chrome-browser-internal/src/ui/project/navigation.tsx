/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCollapsibleNavBeta } from '@elastic/eui';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const LOCAL_STORAGE_IS_COLLAPSED_KEY = 'PROJECT_NAVIGATION_COLLAPSED' as const;

export const ProjectNavigation: React.FC = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useLocalStorage(LOCAL_STORAGE_IS_COLLAPSED_KEY, false);
  const onCollapseToggle = (nextIsCollapsed: boolean) => {
    setIsCollapsed(nextIsCollapsed);
  };

  return (
    <EuiCollapsibleNavBeta
      data-test-subj="projectLayoutSideNav"
      initialIsCollapsed={isCollapsed}
      onCollapseToggle={onCollapseToggle}
      css={isCollapsed ? { display: 'none;' } : {}}
    >
      {children}
    </EuiCollapsibleNavBeta>
  );
};
