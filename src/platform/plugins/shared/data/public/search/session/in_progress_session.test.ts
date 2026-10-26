/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  addInProgressSessionId,
  getInProgressSessionIds,
  IN_PROGRESS_SESSION_PREFIX,
  setInProgressSessionIds,
} from './in_progress_session';

beforeEach(() => {
  localStorage.clear();
});

describe('getInProgressSessionIds', () => {
  describe('when there are no in-progress sessions', () => {
    it('returns an empty array', () => {
      // When
      const sessionIds = getInProgressSessionIds();

      // Then
      expect(sessionIds).toEqual([]);
    });
  });

  describe('when there are in-progress sessions', () => {
    it('returns an array of session IDs', () => {
      // Given
      localStorage.setItem('in-progress-background-search-session-1', 'session-1');
      localStorage.setItem('in-progress-background-search-session-2', 'session-2');
      localStorage.setItem('some-other-key', 'some-value');

      // When
      const sessionIds = getInProgressSessionIds();

      // Then
      expect(sessionIds).toEqual(['session-1', 'session-2']);
    });
  });
});

describe('addInProgressSessionId', () => {
  it('adds a session ID to localStorage', () => {
    // Given
    const sessionId = 'session-123';

    // When
    addInProgressSessionId(sessionId);

    // Then
    expect(localStorage.getItem(`${IN_PROGRESS_SESSION_PREFIX}-${sessionId}`)).toBe(sessionId);
  });
});

describe('setInProgressSessionIds', () => {
  describe('when there are NO existing in-progress sessions', () => {
    it('adds the new session IDs to localStorage', () => {
      // Given
      const newSessionIds = ['session-1', 'session-2'];

      // When
      setInProgressSessionIds(newSessionIds);

      // Then
      expect(localStorage.getItem(`${IN_PROGRESS_SESSION_PREFIX}-session-1`)).toBe('session-1');
      expect(localStorage.getItem(`${IN_PROGRESS_SESSION_PREFIX}-session-2`)).toBe('session-2');
    });
  });

  describe('when there are existing in-progress sessions', () => {
    it('replaces the existing session IDs with the new ones', () => {
      // Given
      localStorage.setItem(`${IN_PROGRESS_SESSION_PREFIX}-old-session-1`, 'old-session-1');
      localStorage.setItem(`${IN_PROGRESS_SESSION_PREFIX}-old-session-2`, 'old-session-2');
      const newSessionIds = ['new-session-1', 'new-session-2'];

      // When
      setInProgressSessionIds(newSessionIds);

      // Then
      expect(localStorage.getItem(`${IN_PROGRESS_SESSION_PREFIX}-old-session-1`)).toBeNull();
      expect(localStorage.getItem(`${IN_PROGRESS_SESSION_PREFIX}-old-session-2`)).toBeNull();
      expect(localStorage.getItem(`${IN_PROGRESS_SESSION_PREFIX}-new-session-1`)).toBe(
        'new-session-1'
      );
      expect(localStorage.getItem(`${IN_PROGRESS_SESSION_PREFIX}-new-session-2`)).toBe(
        'new-session-2'
      );
    });
  });
});
