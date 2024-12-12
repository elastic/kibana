/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaSearchResponse } from '@kbn/search-types';
import { isAbortResponse, isRunningResponse, getEsPreference } from './utils';
import { UI_SETTINGS } from '..';

describe('utils', () => {
  describe('isAbortResponse', () => {
    it('returns `true` if the response is undefined', () => {
      const isError = isAbortResponse();
      expect(isError).toBe(true);
    });

    it('returns `true` if rawResponse is undefined', () => {
      const isError = isAbortResponse({} as unknown as IKibanaSearchResponse);
      expect(isError).toBe(true);
    });
  });

  describe('isRunningResponse', () => {
    it('returns `false` if the response is undefined', () => {
      const isRunning = isRunningResponse();
      expect(isRunning).toBe(false);
    });

    it('returns `true` if the response is running', () => {
      const isRunning = isRunningResponse({
        isRunning: true,
        rawResponse: {},
      });
      expect(isRunning).toBe(true);
    });

    it('returns `false` if the response is finished running', () => {
      const isRunning = isRunningResponse({
        isRunning: false,
        rawResponse: {},
      });
      expect(isRunning).toBe(false);
    });
  });

  describe('getEsPreference', () => {
    const mockConfigGet = jest.fn();

    beforeEach(() => {
      mockConfigGet.mockClear();
    });

    test('returns the session ID if set to sessionId', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'sessionId';
        if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
      });
      const preference = getEsPreference(mockConfigGet, 'my_session_id');
      expect(preference).toBe('my_session_id');
    });

    test('returns the custom preference if set to custom', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'custom';
        if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
      });
      const preference = getEsPreference(mockConfigGet);
      expect(preference).toBe('foobar');
    });

    test('returns undefined if set to none', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'none';
        if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
      });
      const preference = getEsPreference(mockConfigGet);
      expect(preference).toBe(undefined);
    });
  });
});
