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

/** Controls a user can deliberately move to; focus anywhere else fell there by default. */
const INTERACTIVE = 'a[href], button, input, select, textarea, [contenteditable="true"]';

/**
 * Returns focus to the trigger element when a flyout closes.
 * Defers execution to run after EUI's built-in focus restoration.
 * TODO: Remove when https://github.com/elastic/eui/issues/9365 is fixed.
 */
export const returnFocusToTrigger = (trigger: RefObject<HTMLButtonElement>) => {
  setTimeout(() => {
    // A closing flyout parks focus on `<body>`, or on the container of a parent still open behind
    // it. Focus on a control instead means the user moved during the delay, or that focus already
    // landed where it belongs, and either way taking it away would be the worse bug.
    if (document.activeElement?.closest(INTERACTIVE)) return;
    trigger.current?.focus();
  }, RETURN_FOCUS_DELAY);
};
