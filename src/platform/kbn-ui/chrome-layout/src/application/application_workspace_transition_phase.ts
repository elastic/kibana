/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type ApplicationWorkspaceTransitionPhase = 'none' | 'closing' | 'opening';

export interface ApplicationWorkspaceRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const domRectToApplicationWorkspaceRect = (
  domRect: DOMRect
): ApplicationWorkspaceRect => ({
  top: domRect.top,
  left: domRect.left,
  width: domRect.width,
  height: domRect.height,
});

/**
 * Derives the active application-workspace transition phase for the current render.
 * `heldPhase` keeps opening/closing sticky after `prevOpen` updates until the decoy completes.
 */
export const resolveApplicationWorkspaceTransitionPhase = ({
  canAnimate,
  applicationWorkspaceOpen,
  prevApplicationWorkspaceOpen,
  heldPhase,
}: {
  canAnimate: boolean;
  applicationWorkspaceOpen: boolean;
  prevApplicationWorkspaceOpen: boolean;
  heldPhase: ApplicationWorkspaceTransitionPhase;
}): ApplicationWorkspaceTransitionPhase => {
  if (!canAnimate) {
    return 'none';
  }

  if (prevApplicationWorkspaceOpen && !applicationWorkspaceOpen) {
    return 'closing';
  }

  if (!prevApplicationWorkspaceOpen && applicationWorkspaceOpen && heldPhase === 'none') {
    return 'opening';
  }

  if (heldPhase === 'opening' && applicationWorkspaceOpen) {
    return 'opening';
  }

  if (heldPhase === 'closing' && !applicationWorkspaceOpen) {
    return 'closing';
  }

  return heldPhase;
};
