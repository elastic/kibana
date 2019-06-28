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

import { newPlatformInjectedMetadata } from './injected_vars.test.mocks';
import { initChromeInjectedVarsApi } from './injected_vars';

function initChrome() {
  const chrome: any = {};
  initChromeInjectedVarsApi(chrome);
  return chrome;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('#getInjected()', () => {
  it('proxies to newPlatformInjectedMetadata service', () => {
    const chrome = initChrome();

    chrome.getInjected();
    chrome.getInjected('foo');
    chrome.getInjected('foo', 'bar');
    expect(newPlatformInjectedMetadata.getInjectedVars.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [],
]
`);
    expect(newPlatformInjectedMetadata.getInjectedVar.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "foo",
    undefined,
  ],
  Array [
    "foo",
    "bar",
  ],
]
`);
  });

  it('returns mutable values, but does not persist changes internally', () => {
    const chrome = initChrome();

    newPlatformInjectedMetadata.getInjectedVars.mockReturnValue(
      Object.freeze({
        foo: Object.freeze({
          bar: Object.freeze({
            baz: 1,
          }),
        }),
      })
    );

    const vars = chrome.getInjected();
    expect(() => {
      vars.newProperty = true;
    }).not.toThrowError();
    expect(chrome.getInjected()).not.toHaveProperty('newProperty');
  });
});
