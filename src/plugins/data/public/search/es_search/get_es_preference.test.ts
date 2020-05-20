/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getEsPreference } from './get_es_preference';
import { CoreStart } from '../../../../../core/public';
import { coreMock } from '../../../../../core/public/mocks';
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
