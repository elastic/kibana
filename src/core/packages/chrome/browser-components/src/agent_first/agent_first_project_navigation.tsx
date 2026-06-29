/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { Navigation as NavigationComponent } from '@kbn/ui-side-navigation';
import classnames from 'classnames';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useIsNextChrome } from '@kbn/core-chrome-browser-hooks';
import type { ChromeNavigationProps } from '../project/sidenav/navigation/navigation';
import { useNavigationItems } from '../project/sidenav/navigation/navigation';

export const AgentFirstProjectNavigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems();
  const isNextChrome = useIsNextChrome();

  const navItems = useMemo(() => {
    if (!state) {
      return null;
    }

    return state.navItems;
  }, [state]);

  if (!state || !navItems) {
    return null;
  }

  const { logoItem, activeItemId, solutionId } = state;
  const showTopSeparator = props.showTopSeparator ?? isNextChrome;

  return (
    <KibanaSectionErrorBoundary sectionName={'Navigation'} maxRetries={3}>
      <NavigationComponent
        items={navItems}
        logo={logoItem}
        isCollapsed={props.isCollapsed}
        setWidth={props.setWidth}
        onToggleCollapsed={props.onToggleCollapsed}
        activeItemId={activeItemId}
        showTopSeparator={showTopSeparator}
        navTopControls={props.navTopControls}
        navFooterControls={props.navFooterControls}
        data-test-subj={classnames(`${solutionId}SideNav`, 'projectSideNav', 'projectSideNavV2')}
      />
    </KibanaSectionErrorBoundary>
  );
};
