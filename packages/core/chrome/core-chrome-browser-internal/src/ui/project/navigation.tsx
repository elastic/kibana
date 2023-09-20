/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCollapsibleNav, EuiCollapsibleNavProps } from '@elastic/eui';

const SIZE_EXPANDED = 248;
const SIZE_COLLAPSED = 0;

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

  const DOCKED_BREAKPOINT = 's' as const;
  const isVisible = isOpen;

  return (
    <>
      {
        /* must render the tree to initialize the navigation, even if it shouldn't be visible */
        !isOpen && <div hidden>{children}</div>
      }
      <EuiCollapsibleNav
        className="projectLayoutSideNav"
        css={collabsibleNavCSS}
        isOpen={isVisible /* only affects docked state */}
        showButtonIfDocked={true}
        onClose={closeNav}
        isDocked={true}
        size={isVisible ? SIZE_EXPANDED : SIZE_COLLAPSED}
        hideCloseButton={false}
        dockedBreakpoint={DOCKED_BREAKPOINT}
        ownFocus={false}
        button={button}
      >
        {isOpen && children}
      </EuiCollapsibleNav>
    </>
  );
};
