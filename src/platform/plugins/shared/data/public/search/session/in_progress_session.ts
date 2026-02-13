/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const IN_PROGRESS_SESSION_PREFIX = 'in-progress-background-search';

export function getInProgressSessionIds(): string[] {
  const sessionIds: string[] = [];
  // Retrieve all in-progress session IDs
  for (const key in localStorage) {
    if (key.indexOf(IN_PROGRESS_SESSION_PREFIX) === 0) {
      const sessionId = key.replace(`${IN_PROGRESS_SESSION_PREFIX}-`, '');
      sessionIds.push(sessionId);
    }
  }
  return sessionIds;
}

export function addInProgressSessionId(sessionId: string) {
  localStorage.setItem(`${IN_PROGRESS_SESSION_PREFIX}-${sessionId}`, sessionId);
}

export function setInProgressSessionIds(sessionIds: string[]) {
  // Clear all existing in-progress session IDs
  for (const key in localStorage) {
    if (key.indexOf(IN_PROGRESS_SESSION_PREFIX) === 0) {
      localStorage.removeItem(key);
    }
  }

  // Add new session IDs
  sessionIds.forEach((sessionId) => {
    localStorage.setItem(`${IN_PROGRESS_SESSION_PREFIX}-${sessionId}`, sessionId);
  });
}
