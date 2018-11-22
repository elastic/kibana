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

import * as Rx from 'rxjs';

import { __newPlatformInit__, initChromeControlsApi } from './controls';

const newPlatformChrome = {
  setIsVisible: jest.fn(),
  getIsVisible$: jest.fn(),
};

__newPlatformInit__(newPlatformChrome as any);

function setup() {
  const isVisible$ = new Rx.BehaviorSubject(true);
  newPlatformChrome.getIsVisible$.mockReturnValue(isVisible$);

  const chrome: any = {};
  initChromeControlsApi(chrome);
  return { chrome, isVisible$ };
}

afterEach(() => {
  jest.resetAllMocks();
});

describe('setVisible', () => {
  it('passes the visibility to the newPlatform', () => {
    const { chrome } = setup();
    chrome.setVisible(true);
    chrome.setVisible(false);
    chrome.setVisible(false);
    expect(newPlatformChrome.setIsVisible.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    true,
  ],
  Array [
    false,
  ],
  Array [
    false,
  ],
]
`);
  });
});

describe('getVisible', () => {
  it('returns a the cached value emitted by the newPlatformChrome', () => {
    const { chrome, isVisible$ } = setup();
    isVisible$.next(true);
    expect(chrome.getVisible()).toBe(true);
    isVisible$.next(false);
    expect(chrome.getVisible()).toBe(false);
  });
});
