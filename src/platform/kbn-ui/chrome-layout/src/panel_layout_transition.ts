/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationWorkspaceTransitionPhase } from './application/application_workspace_transition_phase';
import type { ChromeStyle } from './layout.types';

/** Matches application workspace decoy timing. */
export const PANEL_LAYOUT_TRANSITION_MS = 250;

export const getPanelLayoutTransition = (shouldAnimate: boolean) =>
  shouldAnimate
    ? { duration: PANEL_LAYOUT_TRANSITION_MS / 1000, ease: 'easeInOut' as const }
    : { duration: 0 };

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const shouldAnimateAgentPanelWidth = ({
  chromeStyle,
  applicationWorkspaceOpen,
  applicationWorkspaceTransitionPhase = 'none',
}: {
  chromeStyle?: ChromeStyle;
  agentWorkspaceOpen: boolean;
  applicationWorkspaceOpen: boolean;
  applicationWorkspaceTransitionPhase?: ApplicationWorkspaceTransitionPhase;
}): boolean => {
  if (chromeStyle !== 'project' || prefersReducedMotion()) {
    return false;
  }

  if (!applicationWorkspaceOpen) {
    return applicationWorkspaceTransitionPhase !== 'none';
  }

  // Dual-panel: animate agent show/hide and resize.
  return true;
};

/** @deprecated Use shouldAnimateAgentPanelWidth */
export const shouldAnimatePanelLayout = shouldAnimateAgentPanelWidth;

export const shouldAnimateApplicationPanelWidth = ({
  chromeStyle,
  applicationWorkspaceTransitionPhase = 'none',
}: {
  chromeStyle?: ChromeStyle;
  applicationWorkspaceTransitionPhase?: ApplicationWorkspaceTransitionPhase;
}): boolean => {
  if (chromeStyle !== 'project' || prefersReducedMotion()) {
    return false;
  }

  return applicationWorkspaceTransitionPhase !== 'none';
};
