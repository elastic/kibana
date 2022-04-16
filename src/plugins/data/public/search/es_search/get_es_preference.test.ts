/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { getEsPreference } from './get_es_preference';
import { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { UI_SETTINGS } from '../../../common';

describe('Get ES preference', () => {
  let mockCoreStart: MockedKeys<CoreStart>;

  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
  });

  test('returns the session ID if set to sessionId', () => {
    mockCoreStart.uiSettings.get.mockImplementation((key: string) => {
      if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'sessionId';
      if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
    });
    const preference = getEsPreference(mockCoreStart.uiSettings, 'my_session_id');
    expect(preference).toBe('my_session_id');
  });

  test('returns the custom preference if set to custom', () => {
    mockCoreStart.uiSettings.get.mockImplementation((key: string) => {
      if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'custom';
      if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
    });
    const preference = getEsPreference(mockCoreStart.uiSettings);
    expect(preference).toBe('foobar');
  });

  test('returns undefined if set to none', () => {
    mockCoreStart.uiSettings.get.mockImplementation((key: string) => {
      if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'none';
      if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
    });
    const preference = getEsPreference(mockCoreStart.uiSettings);
    expect(preference).toBe(undefined);
  });
});
