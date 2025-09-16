/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { pick } from 'lodash';
import { act } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createHttpFetchError } from '@kbn/core-http-browser-mocks';
import { RateLimiterError } from './error';

describe('RateLimiterError', () => {
  let resetWindow: () => void;
  let result: ReturnType<typeof renderWithI18n>;

  beforeAll(() => {
    const originalDescriptors = pick(Object.getOwnPropertyDescriptors(window), 'location');
    resetWindow = () => void Object.defineProperties(window, originalDescriptors);

    Object.defineProperties(window, {
      location: {
        value: {
          reload: jest.fn(),
        },
      },
    });
  });

  afterAll(() => {
    resetWindow();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    result = renderWithI18n(
      <RateLimiterError
        error={createHttpFetchError(
          'Server is overloaded',
          undefined,
          undefined,
          new Response(undefined, { headers: { 'Retry-After': '2' } })
        )}
      />
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('should render a generic error screen', async () => {
    expect(result.queryByTestId('rateLimiterScreen')).toBeTruthy();
    expect(result.queryByText('Server is overloaded')).toBeTruthy();
  });

  it('should count down the remaining time', async () => {
    const button = result.getByTestId('reload') as HTMLButtonElement;
    expect(button.disabled).toBeTruthy();
    expect(button.textContent).toContain('(2)');
    act(() => jest.advanceTimersByTime(1000));
    expect(button.textContent).toContain('(1)');
    act(() => jest.advanceTimersByTime(1000));
    expect(button.textContent).not.toContain('(0)');
    expect(button.disabled).toBeFalsy();
  });

  it('should reload on button click', async () => {
    const button = result.getByTestId('reload') as HTMLButtonElement;

    button.click();
    expect(window.location.reload).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1000));
    act(() => jest.advanceTimersByTime(1000));
    button.click();
    expect(window.location.reload).toHaveBeenCalled();
  });
});
