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

jest.useFakeTimers();

describe('Get ES preference', () => {
  test('returns the session ID if set to sessionId', () => {
    const setPreference = 'sessionId';
    const customPreference = 'foobar';
    const sessionId = 'my_session_id';
    const preference = getEsPreference(setPreference, customPreference, sessionId);
    expect(preference).toBe(sessionId);
  });

  test('returns the custom preference if set to custom', () => {
    const setPreference = 'custom';
    const customPreference = 'foobar';
    const preference = getEsPreference(setPreference, customPreference);
    expect(preference).toBe(customPreference);
  });

  test('returns undefined if set to none', () => {
    const setPreference = 'none';
    const customPreference = 'foobar';
    const preference = getEsPreference(setPreference, customPreference);
    expect(preference).toBe(undefined);
  });
});
