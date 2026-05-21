/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

import { useBooleanUrlState } from './use_boolean_url_state';

const PARAM = 'enabled';

const renderWithHistory = (history: MemoryHistory) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Router history={history}>{children}</Router>
  );
  return renderHook(() => useBooleanUrlState(PARAM), { wrapper });
};

describe('useBooleanUrlState', () => {
  afterEach(cleanup);

  it('returns false when the param is absent', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const { result } = renderWithHistory(history);

    expect(result.current[0]).toBe(false);
  });

  it('returns true when the URL has the param set to true', () => {
    const history = createMemoryHistory({ initialEntries: [`/?${PARAM}=true`] });
    const { result } = renderWithHistory(history);

    expect(result.current[0]).toBe(true);
  });

  it('pushes a history entry and updates state when set to true', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const startLength = history.length;
    const { result } = renderWithHistory(history);

    await act(async () => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(history.length).toBe(startLength + 1);
    expect(history.location.search).toContain(`${PARAM}=true`);
  });

  it('replaces (does not push a new entry) and removes the param when set to false', async () => {
    const history = createMemoryHistory({ initialEntries: [`/?${PARAM}=true`] });
    const startLength = history.length;
    const { result } = renderWithHistory(history);

    await act(async () => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(history.length).toBe(startLength);
    expect(history.location.search).not.toContain(PARAM);
  });

  it('leaves the URL clean after an open-then-close cycle', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const { result } = renderWithHistory(history);

    await act(async () => {
      result.current[1](true);
    });
    await act(async () => {
      result.current[1](false);
    });

    expect(history.location.search).toBe('');
  });

  it('re-syncs state when the user navigates back', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const { result } = renderWithHistory(history);

    await act(async () => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      history.goBack();
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });
  });

  it('throws when called outside a <Router>', () => {
    // Suppress React's "uncaught error" log noise from the render throw.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useBooleanUrlState(PARAM))).toThrow(
        /must be called inside a <Router>/
      );
    } finally {
      spy.mockRestore();
    }
  });
});
