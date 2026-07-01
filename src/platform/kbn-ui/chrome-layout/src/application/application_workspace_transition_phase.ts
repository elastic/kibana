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

let transitionPhase: ApplicationWorkspaceTransitionPhase = 'none';

export const getApplicationWorkspaceTransitionPhase = (): ApplicationWorkspaceTransitionPhase =>
  transitionPhase;

export const setApplicationWorkspaceTransitionPhase = (
  phase: ApplicationWorkspaceTransitionPhase
): void => {
  transitionPhase = phase;
};

export const syncApplicationWorkspaceTransitionPhase = ({
  canAnimate,
  applicationWorkspaceOpen,
  prevApplicationWorkspaceOpen,
}: {
  canAnimate: boolean;
  applicationWorkspaceOpen: boolean;
  prevApplicationWorkspaceOpen: boolean;
}): ApplicationWorkspaceTransitionPhase => {
  if (!canAnimate) {
    transitionPhase = 'none';
    return transitionPhase;
  }

  if (
    prevApplicationWorkspaceOpen &&
    !applicationWorkspaceOpen
  ) {
    transitionPhase = 'closing';
  } else if (
    !prevApplicationWorkspaceOpen &&
    applicationWorkspaceOpen &&
    transitionPhase === 'none'
  ) {
    transitionPhase = 'opening';
  }

  return transitionPhase;
};
