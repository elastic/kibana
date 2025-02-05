/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const SHELL_TAB_ID = 'shell';
export const HISTORY_TAB_ID = 'history';
export const CONFIG_TAB_ID = 'config';

export const SHELL_TOUR_STEP = 1;
export const EDITOR_TOUR_STEP = 2;
export const HISTORY_TOUR_STEP = 3;
export const CONFIG_TOUR_STEP = 4;
export const FILES_TOUR_STEP = 5;

// Key used for storing tour state in local storage
export const TOUR_STORAGE_KEY = 'consoleTour';

export const INITIAL_TOUR_CONFIG = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: 'Console onboarding', // Used for state in local storage
};

export const EXPORT_FILE_NAME = 'console_export';
