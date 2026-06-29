/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { Navigation as NavigationComponent } from '@kbn/ui-side-navigation';
import classnames from 'classnames';
import type { MenuItem, SecondaryMenuItem, SideNavLogo } from '@kbn/ui-side-navigation/types';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useAgentWorkspaceOpen, useIsNextChrome } from '@kbn/core-chrome-browser-hooks';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useChromeComponentsDeps } from '../context';
import type { ChromeNavigationProps } from '../project/sidenav/navigation/navigation';
import { useNavigationItems } from '../project/sidenav/navigation/navigation';
import { AGENT_FIRST_AGENTS_TOGGLE_ID } from './agent_first_nav_constants';

const agentsToggleLabel = i18n.translate('core.ui.chrome.agentFirstNav.agentsToggle', {
  defaultMessage: 'Agents',
});

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

    if (!showAgentsToggle) {
      return state.navItems;
    }

    const agentsToggleItem: MenuItem = {
      id: AGENT_FIRST_AGENTS_TOGGLE_ID,
      label: agentsToggleLabel,
      iconType: 'productAgent',
      isHighlighted: agentWorkspaceOpen,
      'data-test-subj': 'agentFirstNavAgentsToggle',
    };

    return {
      ...state.navItems,
      primaryItems: [agentsToggleItem, ...state.navItems.primaryItems],
    };
  }, [agentWorkspaceOpen, showAgentsToggle, state]);

  const handleItemClick = useCallback(
    (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
      if (item.id !== AGENT_FIRST_AGENTS_TOGGLE_ID) {
        return;
      }

      if (agentWorkspaceOpen) {
        chrome.agentWorkspace.close();
      } else {
        chrome.agentWorkspace.open();
      }
    },
    [agentWorkspaceOpen, chrome]
  );

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
        onItemClick={handleItemClick}
        data-test-subj={classnames(`${solutionId}SideNav`, 'projectSideNav', 'projectSideNavV2')}
      />
    </KibanaSectionErrorBoundary>
  );
};
