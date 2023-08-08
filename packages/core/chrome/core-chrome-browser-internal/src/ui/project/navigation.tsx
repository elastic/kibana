/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCollapsibleNav, EuiCollapsibleNavProps, useIsWithinMinBreakpoint } from '@elastic/eui';

const SIZE_EXPANDED = 248;
const SIZE_COLLAPSED = 48;

export interface ProjectNavigationProps {
  isOpen: boolean;
  closeNav: () => void;
  button: EuiCollapsibleNavProps['button'];
}

export const ProjectNavigation: React.FC<ProjectNavigationProps> = ({
  children,
  isOpen,
  closeNav,
  button,
}) => {
  const collabsibleNavCSS = css`
    border-inline-end-width: 1,
    display: flex,
    flex-direction: row,
  `;

  // on small screen isOpen hides the nav,
  // on larger screen isOpen makes it smaller
  const DOCKED_BREAKPOINT = 's' as const;
  const isCollapsible = useIsWithinMinBreakpoint(DOCKED_BREAKPOINT);
  const isVisible = isCollapsible ? true : isOpen;
  const isCollapsed = isCollapsible ? !isOpen : false;

  return (
    <EuiCollapsibleNav
      css={collabsibleNavCSS}
      isOpen={isVisible}
      showButtonIfDocked={true}
      onClose={closeNav}
      isDocked={true}
      size={isCollapsed ? SIZE_COLLAPSED : SIZE_EXPANDED}
      hideCloseButton={false}
      dockedBreakpoint={DOCKED_BREAKPOINT}
      ownFocus={false}
      button={button}
    >
      {!isCollapsed && children}
    </EuiCollapsibleNav>
  );
};
