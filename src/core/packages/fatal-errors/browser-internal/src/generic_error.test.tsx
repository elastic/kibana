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
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { GenericError } from './generic_error';

describe('GenericError', () => {
  let resetWindow: () => void;
  let result: ReturnType<typeof renderWithI18n>;

  beforeAll(() => {
    const originalDescriptors = pick(
      Object.getOwnPropertyDescriptors(window),
      'history',
      'localStorage',
      'location',
      'sessionStorage'
    );
    resetWindow = () => void Object.defineProperties(window, originalDescriptors);

    Object.defineProperties(window, {
      history: {
        value: {
          back: jest.fn(),
        },
      },
      localStorage: {
        value: {
          clear: jest.fn(),
        },
      },
      location: {
        value: {
          reload: jest.fn(),
        },
      },
      sessionStorage: {
        value: {
          clear: jest.fn(),
        },
      },
    });
  });

  afterAll(() => {
    resetWindow();
  });

  beforeEach(() => {
    result = renderWithI18n(
      <GenericError
        buildNumber={123}
        kibanaVersion={'9.0.0'}
        errors={[
          {
            error: new Error('Error 1'),
            source: 'Source 1',
          },
          {
            error: new Error('Error 2'),
            source: 'Source 2',
          },
        ]}
      />
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render a generic error screen', () => {
    expect(result.queryByTestId('fatalErrorScreen')).toBeTruthy();
  });

  it('should render multiple errors', async () => {
    expect(result.queryByText('Source 1: Error 1')).toBeTruthy();
    expect(result.queryByText('Source 2: Error 2')).toBeTruthy();
  });

  it('should clear session storage on button click', async () => {
    window.location.hash = '/foo/bar';
    result.queryByTestId('clearSession')?.click();

    expect(window.localStorage.clear).toHaveBeenCalled();
    expect(window.sessionStorage.clear).toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });

  it('should go back on button click', async () => {
    result.queryByTestId('goBack')?.click();

    expect(window.history.back).toHaveBeenCalled();
  });
});
