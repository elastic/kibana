/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';
import { RouteSelfHealErrorBoundary } from './route_self_heal_error_boundary';
import { InvalidRouteParamsException } from './errors';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(),
  useLocation: jest.fn(),
}));

// Captures errors that propagate out of RouteSelfHealErrorBoundary.
let caughtError: Error | null = null;

class CatchAllBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    caughtError = error;
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

describe('RouteSelfHealErrorBoundary', () => {
  const mockReplace = jest.fn();
  const baseLocation = { pathname: '/test', search: '', hash: '' };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReplace.mockClear();
    caughtError = null;
    (useHistory as jest.Mock).mockReturnValue({ replace: mockReplace });
    (useLocation as jest.Mock).mockReturnValue({ ...baseLocation });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('catches InvalidRouteParamsException and calls history.replace with the patched query', () => {
    const patchedQuery = { rangeFrom: 'now-30m', rangeTo: 'now' };
    const error = new InvalidRouteParamsException('invalid params', {
      path: {},
      query: patchedQuery,
    });

    const ThrowingComponent = () => {
      throw error;
    };

    render(
      <CatchAllBoundary>
        <RouteSelfHealErrorBoundary>
          <ThrowingComponent />
        </RouteSelfHealErrorBoundary>
      </CatchAllBoundary>
    );

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ search: qs.stringify(patchedQuery) })
    );
    expect(caughtError).toBeNull();
  });

  it('re-throws non-InvalidRouteParamsException errors without calling history.replace', () => {
    const nonRouteError = new Error('some unrelated error');

    const ThrowingComponent = () => {
      throw nonRouteError;
    };

    render(
      <CatchAllBoundary>
        <RouteSelfHealErrorBoundary>
          <ThrowingComponent />
        </RouteSelfHealErrorBoundary>
      </CatchAllBoundary>
    );

    expect(caughtError).toBe(nonRouteError);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
