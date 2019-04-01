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

jest.mock(
  'ui/chrome',
  () => ({
    getInjected: (key: string) => {
      if (key !== 'uiCapabilities') {
        throw new Error(`Unexpected key for test: ${key}`);
      }

      return {
        navLinks: {},
        app1: {
          feature1: true,
          feature2: false,
        },
        app2: {
          feature1: true,
          feature3: true,
        },
      };
    },
  }),
  { virtual: true }
);

import { uiCapabilities } from './ui_capabilities';

describe('uiCapabilities', () => {
  it('allows a nested property to be accessed', () => {
    expect(uiCapabilities.app1.feature2).toEqual(false);
  });
});
