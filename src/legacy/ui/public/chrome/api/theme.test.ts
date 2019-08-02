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

import { newPlatformChrome } from './theme.test.mocks';
import { initChromeThemeApi } from './theme';

function setup() {
  const brand$ = new Rx.BehaviorSubject({ logo: 'foo', smallLogo: 'foo' });
  newPlatformChrome.getBrand$.mockReturnValue(brand$);

  const applicationClasses$ = new Rx.BehaviorSubject([] as string[]);
  newPlatformChrome.getApplicationClasses$.mockReturnValue(applicationClasses$);

  const chrome: any = {};
  initChromeThemeApi(chrome);
  return { chrome, brand$, applicationClasses$ };
}

afterEach(() => {
  jest.resetAllMocks();
});

describe('setBrand', () => {
  it('proxies to newPlatformChrome', () => {
    const { chrome } = setup();

    chrome.setBrand({
      logo: 'foo.svg',
      smallLogo: 'smallFoo.svg',
    });

    chrome.setBrand({
      logo: 'baz',
    });

    expect(newPlatformChrome.setBrand.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "logo": "foo.svg",
      "smallLogo": "smallFoo.svg",
    },
  ],
  Array [
    Object {
      "logo": "baz",
    },
  ],
]
`);
  });
});

describe('getBrand', () => {
  it('returns named properties from cached values emitted from newPlatformChrome', () => {
    const { chrome, brand$ } = setup();
    expect(chrome.getBrand('logo')).toBe('foo');
    expect(chrome.getBrand('smallLogo')).toBe('foo');
    expect(chrome.getBrand()).toBe(undefined);

    brand$.next({
      logo: 'bar.svg',
      smallLogo: 'smallBar.svg',
    });

    expect(chrome.getBrand('logo')).toBe('bar.svg');
    expect(chrome.getBrand('smallLogo')).toBe('smallBar.svg');
    expect(chrome.getBrand()).toBe(undefined);
  });
});

describe('addApplicationClass', () => {
  it('proxies each class as a separate argument to newPlatformChrome', () => {
    const { chrome } = setup();
    chrome.addApplicationClass('foo');
    chrome.addApplicationClass(['bar', 'baz']);
    chrome.addApplicationClass([]);
    expect(newPlatformChrome.addApplicationClass.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "foo",
  ],
  Array [
    "bar",
  ],
  Array [
    "baz",
  ],
]
`);
  });
});

describe('removeApplicationClass', () => {
  it('proxies each class as a separate argument to newPlatformChrome', () => {
    const { chrome } = setup();
    chrome.removeApplicationClass('foo');
    chrome.removeApplicationClass(['bar', 'baz']);
    chrome.removeApplicationClass([]);
    expect(newPlatformChrome.removeApplicationClass.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "foo",
  ],
  Array [
    "bar",
  ],
  Array [
    "baz",
  ],
]
`);
  });
});

describe('getApplicationClasses', () => {
  it('returns cached values emitted from newPlatformChrome as a single string', () => {
    const { chrome, applicationClasses$ } = setup();

    expect(chrome.getApplicationClasses()).toBe('');
    applicationClasses$.next(['foo', 'bar']);
    expect(chrome.getApplicationClasses()).toBe('foo bar');
    applicationClasses$.next(['bar']);
    expect(chrome.getApplicationClasses()).toBe('bar');
  });
});
