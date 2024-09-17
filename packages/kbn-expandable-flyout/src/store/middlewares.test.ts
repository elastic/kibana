/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { localStorageMock } from '../../__mocks__';
import { EXPANDABLE_FLYOUT_LOCAL_STORAGE, PUSH_VS_OVERLAY_LOCAL_STORAGE } from '../constants';
import { savePushVsOverlayToLocalStorageMiddleware } from './middlewares';
import { createAction, type MiddlewareAPI } from '@reduxjs/toolkit';
import { changePushVsOverlayAction } from './actions';

const noTypeAction = createAction<{
  type: 'no_type';
}>('no_type_action');
const randomAction = createAction<{
  type: 'random_type';
}>('random_action');

describe('pushVsOverlayMiddleware', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  it('should ignore action without type', () => {
    savePushVsOverlayToLocalStorageMiddleware({} as MiddlewareAPI)(jest.fn)(noTypeAction);

    expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
  });

  it('should ignore action of types other than changePushVsOverlayAction', () => {
    savePushVsOverlayToLocalStorageMiddleware({} as MiddlewareAPI)(jest.fn)(randomAction);

    expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
  });

  it('should save value to local storage if action is of type changePushVsOverlayAction', () => {
    savePushVsOverlayToLocalStorageMiddleware({} as MiddlewareAPI)(jest.fn)(
      changePushVsOverlayAction({ type: 'push', savedToLocalStorage: true })
    );

    expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(
      JSON.stringify({ [PUSH_VS_OVERLAY_LOCAL_STORAGE]: 'push' })
    );
  });

  it('should not save value to local storage if savedToLocalStorage is false', () => {
    savePushVsOverlayToLocalStorageMiddleware({} as MiddlewareAPI)(jest.fn)(
      changePushVsOverlayAction({ type: 'push', savedToLocalStorage: false })
    );

    expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
  });
});
