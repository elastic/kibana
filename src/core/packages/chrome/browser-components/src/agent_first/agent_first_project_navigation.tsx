/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { Navigation as NavigationComponent } from '@kbn/ui-side-navigation';
import classnames from 'classnames';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useAgentWorkspaceOpen, useIsNextChrome } from '@kbn/core-chrome-browser-hooks';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useChromeComponentsDeps } from '../context';
import type { ChromeNavigationProps } from '../project/sidenav/navigation/navigation';
import { useNavigationItems } from '../project/sidenav/navigation/navigation';
import { AgentFirstAgentsNavItem } from './agent_first_agents_nav_item';

export const AgentFirstProjectNavigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems();
  const isNextChrome = useIsNextChrome();
  const chrome = useChromeService();
  const agentWorkspaceOpen = useAgentWorkspaceOpen();
  const { application } = useChromeComponentsDeps();
  const showAgentsToggle = application.capabilities.agentBuilder?.show === true;

  const navItems = useMemo(() => {
    if (!state) {
      return null;
    }

    return state.navItems;
  }, [state]);

  const toggleAgentsWorkspace = useCallback(() => {
    if (agentWorkspaceOpen) {
      chrome.agentWorkspace.close();
    } else {
      chrome.agentWorkspace.open();
    }
  }, [agentWorkspaceOpen, chrome]);

  const primaryMenuLeading = useMemo(() => {
    if (!showAgentsToggle) {
      return undefined;
    }

    return (
      <AgentFirstAgentsNavItem
        isActive={agentWorkspaceOpen}
        isCollapsed={props.isCollapsed}
        onClick={toggleAgentsWorkspace}
      />
    );
  }, [agentWorkspaceOpen, props.isCollapsed, showAgentsToggle, toggleAgentsWorkspace]);

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
        primaryMenuLeading={primaryMenuLeading}
        data-test-subj={classnames(`${solutionId}SideNav`, 'projectSideNav', 'projectSideNavV2')}
      />
    </KibanaSectionErrorBoundary>
  );
};
