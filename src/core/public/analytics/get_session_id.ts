/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 } from 'uuid';

/**
 * Returns a session ID for the current user.
 * We are storing it to the sessionStorage. This means it remains the same through refreshes,
 * but it is not persisted when closing the browser/tab or manually navigating to another URL.
 */
export function getSessionId(): string {
  const sessionId = sessionStorage.getItem('sessionId') ?? v4();
  sessionStorage.setItem('sessionId', sessionId);
  return sessionId;
}
