/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { layoutVar, layoutVarName } from './css_variables';
export type {
  LayoutVarName,
  CSSVarName,
  LayoutComponent,
  LayoutProperty,
  ApplicationComponent,
  ApplicationVarName,
} from './css_variables';
export { layoutLevels } from './levels';

export const APP_MAIN_SCROLL_CONTAINER_ID = 'app-main-scroll';

export const FLYOUT_SELECTOR = '.euiFlyout[role="dialog"]';

export const MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', `#${APP_MAIN_SCROLL_CONTAINER_ID}`];

export const SIDE_PANEL_CONTENT_GAP = 8;

/** Default width of the agent workspace column in agent-first chrome (POC). */
export const DEFAULT_AGENT_WIDTH = 800;

/** Minimum width of the agent workspace column when agent-first. */
export const MIN_AGENT_WIDTH = 480;

/** Minimum width reserved for the application workspace when agent-first. */
export const MIN_APPLICATION_WORKSPACE_WIDTH = 320;

/** Maximum agent workspace width as a fraction of the viewport width (50vw). */
export const MAX_AGENT_VIEWPORT_WIDTH_RATIO = 0.5;

export const getMaxAgentWorkspaceWidth = (
  navigationWidth: number,
  sidebarWidth: number,
  applicationWorkspaceOpen = true,
  agentWorkspaceOpen = true
): number => {
  if (!agentWorkspaceOpen) {
    return MIN_AGENT_WIDTH;
  }

  if (typeof window === 'undefined') {
    return MIN_AGENT_WIDTH;
  }

  const maxByViewport = Math.floor(window.innerWidth * MAX_AGENT_VIEWPORT_WIDTH_RATIO);
  const reservedApplicationWidth = applicationWorkspaceOpen ? MIN_APPLICATION_WORKSPACE_WIDTH : 0;
  const maxByRemainingSpace =
    window.innerWidth - navigationWidth - reservedApplicationWidth - sidebarWidth;

  return Math.max(MIN_AGENT_WIDTH, Math.min(maxByViewport, maxByRemainingSpace));
};

export const clampAgentWorkspaceWidth = (
  width: number,
  navigationWidth: number,
  sidebarWidth: number,
  applicationWorkspaceOpen = true,
  agentWorkspaceOpen = true
): number =>
  Math.max(
    MIN_AGENT_WIDTH,
    Math.min(
      getMaxAgentWorkspaceWidth(
        navigationWidth,
        sidebarWidth,
        applicationWorkspaceOpen,
        agentWorkspaceOpen
      ),
      Math.floor(width)
    )
  );

/** Full-width agent column when the application workspace is hidden. */
export const getSoloAgentWorkspaceWidth = ({
  navigationWidth,
  sidebarWidth,
  agentMarginLeft = 0,
  applicationMarginRight = 0,
}: {
  navigationWidth: number;
  sidebarWidth: number;
  agentMarginLeft?: number;
  applicationMarginRight?: number;
}): number => {
  if (typeof window === 'undefined') {
    return MIN_AGENT_WIDTH;
  }

  return Math.max(
    MIN_AGENT_WIDTH,
    Math.floor(
      window.innerWidth - navigationWidth - sidebarWidth - agentMarginLeft - applicationMarginRight
    )
  );
};

/** Gutter between nav, agent, and application panels. */
export const AGENT_FIRST_GAP = 8;

/** Extra space above the agent-first left nav. */
export const AGENT_FIRST_NAV_MARGIN_TOP = 12;

export const AGENT_FIRST_FEATURE_FLAG_KEY = 'core.chrome.agentFirst';

export const euiIncludeSelectorInFocusTrap = {
  prop: {
    'data-eui-includes-in-flyout-focus-trap': true,
  },
  selector: `[data-eui-includes-in-flyout-focus-trap="true"]`,
};
