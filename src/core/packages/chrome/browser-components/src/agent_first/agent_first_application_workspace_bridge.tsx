/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { registerBeforeNavigateToApp } from '@kbn/ui-chrome-layout-constants';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { getClosestLink } from '@kbn/shared-ux-utility';

const AGENT_BUILDER_APP_ID = 'agent_builder';
const AGENT_BUILDER_PATH_SEGMENT = '/app/agent_builder';
const PROJECT_NAVIGATION_SELECTOR = '.kbnChromeLayoutNavigation';

const isModifiedNavigationClick = (event: MouseEvent): boolean =>
  event.button !== 0 ||
  event.metaKey ||
  event.altKey ||
  event.ctrlKey ||
  event.shiftKey;

const isAgentBuilderNavigationTarget = (href: string): boolean => {
  try {
    const url = new URL(href, window.location.href);
    return url.pathname.includes(AGENT_BUILDER_PATH_SEGMENT);
  } catch {
    return false;
  }
};

const shouldReopenApplicationWorkspaceForNavigationClick = (
  event: MouseEvent,
  navRoot: HTMLElement
): boolean => {
  if (isModifiedNavigationClick(event)) {
    return false;
  }

  const target = event.target as HTMLElement | null;
  if (!target || !navRoot.contains(target)) {
    return false;
  }

  const link = getClosestLink(target) as HTMLAnchorElement | null;
  if (!link?.href || link.hasAttribute('data-kbn-redirect-app-link-ignore')) {
    return false;
  }

  return !isAgentBuilderNavigationTarget(link.href);
};

/**
 * Reopens the application workspace when navigating to a native app in agent-first chrome.
 */
export const AgentFirstApplicationWorkspaceBridge = () => {
  const chrome = useChromeService();

  useEffect(() => {
    return registerBeforeNavigateToApp((appId) => {
      if (appId !== AGENT_BUILDER_APP_ID) {
        chrome.applicationWorkspace.open();
      }
    });
  }, [chrome]);

  useEffect(() => {
    const handleNavigationClick = (event: MouseEvent) => {
      const navRoot = document.querySelector<HTMLElement>(PROJECT_NAVIGATION_SELECTOR);
      if (!navRoot) {
        return;
      }

      if (shouldReopenApplicationWorkspaceForNavigationClick(event, navRoot)) {
        chrome.applicationWorkspace.open();
      }
    };

    document.addEventListener('click', handleNavigationClick, true);
    return () => document.removeEventListener('click', handleNavigationClick, true);
  }, [chrome]);

  return null;
};
