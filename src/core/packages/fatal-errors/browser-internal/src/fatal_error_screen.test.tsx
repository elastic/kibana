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
import { act, render } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { FatalError } from '@kbn/core-fatal-errors-browser';

import { FatalErrorScreen } from './fatal_error_screen';

describe('FatalErrorScreen', () => {
  const errorFoo: FatalError = { error: new Error('foo') };
  const errorBar: FatalError = { error: new Error('bar') };

  let resetWindow: () => void;
  let children: jest.Mock;
  let error$: Subject<FatalError>;
  let result: ReturnType<typeof render>;

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
    children = jest.fn(() => 'something');
    error$ = new Subject<FatalError>();
    result = render(<FatalErrorScreen error$={error$}>{children}</FatalErrorScreen>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render children', async () => {
    act(() => error$.next(errorFoo));
    expect(result.queryByText('something')).toBeTruthy();
  });

  it('should pass empty array initialy', () => {
    expect(children).toHaveBeenCalledWith([]);
  });

  it('should pass errors to the children', async () => {
    await act(() => {
      error$.next(errorFoo);
      error$.next(errorBar);
    });
    expect(children).toHaveBeenCalledWith([errorFoo, errorBar]);
  });

  it('should refresh the page if a `hashchange` event is dispatched', () => {
    expect(window.location.reload).not.toHaveBeenCalled();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});
