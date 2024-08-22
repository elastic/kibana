/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const SHELL_TAB_ID = 'shell';
export const HISTORY_TAB_ID = 'history';
export const CONFIG_TAB_ID = 'config';

export const SHELL_TOUR_STEP_INDEX = 0;
export const EDITOR_TOUR_STEP_INDEX = 1;
export const HISTORY_TOUR_STEP_INDEX = 2;
export const CONFIG_TOUR_STEP_INDEX = 3;
export const FILES_TOUR_STEP_INDEX = 4;

// Key used for storing tour state in local storage
export const TOUR_STORAGE_KEY = 'consoleTour';

export const INITIAL_TOUR_CONFIG = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: 'Console onboarding', // Used for state in local storage
};
