/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

/**
 * Handler that opens the newsfeed UI and reports unread state.
 *
 * @public
 */
export interface ChromeNewsfeedHandler {
  open: () => void;
  hasNew$: Observable<boolean>;
}

/**
 * Newsfeed and Feedback action registration for the Help menu.
 *
 * @public
 */
export interface ChromeHelp {
  /**
   * Register a handler that opens the feedback UI.
   *
   * @returns A function to unregister the handler.
   */
  registerFeedbackHandler(handler: () => void): () => void;
  /**
   * Register a handler that opens the newsfeed UI.
   *
   * @returns A function to unregister the handler.
   */
  registerNewsfeedHandler(handler: ChromeNewsfeedHandler): () => void;
}
