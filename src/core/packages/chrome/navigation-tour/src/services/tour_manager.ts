/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TourStateMachine } from '../state';
import { sideNavTourSteps } from '../config';

declare global {
  interface Window {
    __SIDENAV_TOUR_STATE?: TourStateMachine;
  }
}

/**
 * Share tour state via globalThis because the tour is needed in core for sidenav,
 * but should be triggered after spaces picker solution tour view completes.
 * Since we don't have proper global state management between these separate plugins,
 * we use globalThis to share state between core and spaces plugins.
 */
const getTourStateMachine = (): TourStateMachine => {
  const global = globalThis as typeof globalThis & {
    __SIDENAV_TOUR_STATE?: TourStateMachine;
  };

  if (!global.__SIDENAV_TOUR_STATE) {
    global.__SIDENAV_TOUR_STATE = new TourStateMachine();
  }

  return global.__SIDENAV_TOUR_STATE;
};

export const startNavigationTour = (options?: { globalStepOffset?: number }) => {
  const stateMachine = getTourStateMachine();
  if (stateMachine.state.isActive) return;

  stateMachine.startTour(sideNavTourSteps, options);
};

export const getNavigationTourStateMachine = () => getTourStateMachine();
