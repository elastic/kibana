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

import { __newPlatformInit__, initChromeInjectedVarsApi } from './injected_vars';

function initChrome() {
  const chrome: any = {};
  initChromeInjectedVarsApi(chrome);
  return chrome;
}

const newPlatformInjectedMetadata: any = {
  getInjectedVars: jest.fn(),
  getInjectedVar: jest.fn(),
};
__newPlatformInit__(newPlatformInjectedMetadata);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('#getInjected()', () => {
  it('proxies to newPlatformInjectedMetadata service', () => {
    const chrome = initChrome();

    chrome.getInjected();
    chrome.getInjected('foo');
    chrome.getInjected('foo', 'bar');

    expect(newPlatformInjectedMetadata).toMatchInlineSnapshot(`
Object {
  "getInjectedVar": [MockFunction] {
    "calls": Array [
      Array [
        "foo",
        undefined,
      ],
      Array [
        "foo",
        "bar",
      ],
    ],
    "results": Array [
      Object {
        "isThrow": false,
        "value": undefined,
      },
      Object {
        "isThrow": false,
        "value": undefined,
      },
    ],
  },
  "getInjectedVars": [MockFunction] {
    "calls": Array [
      Array [],
    ],
    "results": Array [
      Object {
        "isThrow": false,
        "value": undefined,
      },
    ],
  },
}
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
