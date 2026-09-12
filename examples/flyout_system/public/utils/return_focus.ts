/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';

/** Wait for EUI to complete its own focus restoration before applying ours. */
const RETURN_FOCUS_DELAY = 100;

/**
 * Returns focus to the trigger element when a flyout closes.
 * Defers execution to run after EUI's built-in focus restoration.
 * TODO: Remove when https://github.com/elastic/eui/issues/9365 is fixed.
 */
export const returnFocusToTrigger = (trigger: RefObject<HTMLButtonElement>) => {
  setTimeout(() => {
    trigger.current?.focus();
  }, RETURN_FOCUS_DELAY);
};
