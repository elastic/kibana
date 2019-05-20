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

import { createKfetch } from 'ui/kfetch/kfetch';
import { setup } from '../../../../../../test_utils/public/kfetch_test_setup';

const mockChromeFactory = jest.fn(() => {
  return {
    getBasePath: () => `foo`,
    getUiSettingsClient: () => {
      return {
        get: (key: string) => {
          switch (key) {
            case 'history:limit':
              return 10;
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        },
      };
    },
  };
});

export const mockPersistedLog = {
  add: jest.fn(),
  get: jest.fn(() => ['response:200']),
};

export const mockPersistedLogFactory = jest.fn<jest.Mocked<typeof mockPersistedLog>, any>(() => {
  return mockPersistedLog;
});

export const mockGetAutocompleteSuggestions = jest.fn(() => Promise.resolve([]));
const mockAutocompleteProvider = jest.fn(() => mockGetAutocompleteSuggestions);
export const mockGetAutocompleteProvider = jest.fn(() => mockAutocompleteProvider);
const mockKfetch = jest.fn(() => createKfetch(setup().http));

jest.mock('ui/chrome', () => mockChromeFactory());
jest.mock('ui/kfetch', () => ({
  kfetch: () => {},
}));
jest.mock('ui/persisted_log', () => ({
  PersistedLog: mockPersistedLogFactory,
}));
jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'foo',
  },
}));
jest.mock('ui/autocomplete_providers', () => ({
  getAutocompleteProvider: mockGetAutocompleteProvider,
}));
jest.mock('ui/kfetch', () => ({
  __newPlatformSetup__: jest.fn(),
  kfetch: mockKfetch,
}));

import _ from 'lodash';
// Using doMock to avoid hoisting so that I can override only the debounce method in lodash
jest.doMock('lodash', () => ({
  ..._,
  debounce: (func: () => any) => func,
}));
