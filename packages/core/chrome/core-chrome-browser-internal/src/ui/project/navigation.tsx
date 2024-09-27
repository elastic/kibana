/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren, useEffect, useState } from 'react';
import { EuiCollapsibleNavBeta } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

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
  const [collapsibleNavOffset, setCollapsibleNavOffset] = useState(0);
  const clipPathWidth = collapsibleNavOffset + PANEL_WIDTH;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(timeoutId);

      // Debounce the CSS variable change to avoid unnecessary re-renders
      timeoutId = setTimeout(() => {
        const offSet = getComputedStyle(document.documentElement).getPropertyValue(
          '--euiCollapsibleNavOffset'
        );
        setCollapsibleNavOffset(parseFloat(offSet));
      }, 50);
    });

    // Observe changes to the document's styles or any element that might influence the variable
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
      childList: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <EuiCollapsibleNavBeta
      data-test-subj="projectLayoutSideNav"
      isCollapsed={isCollapsed}
      onCollapseToggle={toggleSideNav}
      css={{
        overflow: 'visible',
        clipPath: `polygon(0 0, ${clipPathWidth}px 0, ${clipPathWidth}px 100%, 0 100%)`,
      }}
    >
      {children}
    </EuiCollapsibleNavBeta>
  );
};
