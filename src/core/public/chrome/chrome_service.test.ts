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
import { toArray } from 'rxjs/operators';

const store = new Map();
(window as any).localStorage = {
  setItem: (key: string, value: string) => store.set(String(key), String(value)),
  getItem: (key: string) => store.get(String(key)),
  removeItem: (key: string) => store.delete(String(key)),
};

import { ChromeService } from './chrome_service';

beforeEach(() => {
  store.clear();
});

describe('start', () => {
  describe('brand', () => {
    it('updates/emits the brand as it changes', async () => {
      const service = new ChromeService();
      const start = service.start();
      const promise = start
        .getBrand$()
        .pipe(toArray())
        .toPromise();

      start.setBrand({
        logo: 'big logo',
        smallLogo: 'not so big logo',
      });
      start.setBrand({
        logo: 'big logo without small logo',
      });
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Object {},
  Object {
    "logo": "big logo",
    "smallLogo": "not so big logo",
  },
  Object {
    "logo": "big logo without small logo",
    "smallLogo": undefined,
  },
]
`);
    });
  });

  describe('visibility', () => {
    it('updates/emits the visibility', async () => {
      const service = new ChromeService();
      const start = service.start();
      const promise = start
        .getIsVisible$()
        .pipe(toArray())
        .toPromise();

      start.setIsVisible(true);
      start.setIsVisible(false);
      start.setIsVisible(true);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  true,
  true,
  false,
  true,
]
`);
    });

    it('always emits false if embed query string is in hash when started', async () => {
      window.history.pushState(undefined, '', '#/home?a=b&embed=true');

      const service = new ChromeService();
      const start = service.start();
      const promise = start
        .getIsVisible$()
        .pipe(toArray())
        .toPromise();

      start.setIsVisible(true);
      start.setIsVisible(false);
      start.setIsVisible(true);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  false,
  false,
  false,
  false,
]
`);
    });
  });

  describe('is collapsed', () => {
    it('updates/emits isCollapsed', async () => {
      const service = new ChromeService();
      const start = service.start();
      const promise = start
        .getIsCollapsed$()
        .pipe(toArray())
        .toPromise();

      start.setIsCollapsed(true);
      start.setIsCollapsed(false);
      start.setIsCollapsed(true);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  false,
  true,
  false,
  true,
]
`);
    });

    it('only stores true in localStorage', async () => {
      const service = new ChromeService();
      const start = service.start();

      start.setIsCollapsed(true);
      expect(store.size).toBe(1);

      start.setIsCollapsed(false);
      expect(store.size).toBe(0);
    });
  });

  describe('application classes', () => {
    it('updates/emits the application classes', async () => {
      const service = new ChromeService();
      const start = service.start();
      const promise = start
        .getApplicationClasses$()
        .pipe(toArray())
        .toPromise();

      start.addApplicationClass('foo');
      start.addApplicationClass('foo');
      start.addApplicationClass('bar');
      start.addApplicationClass('bar');
      start.addApplicationClass('baz');
      start.removeApplicationClass('bar');
      start.removeApplicationClass('foo');
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [],
  Array [
    "foo",
  ],
  Array [
    "foo",
  ],
  Array [
    "foo",
    "bar",
  ],
  Array [
    "foo",
    "bar",
  ],
  Array [
    "foo",
    "bar",
    "baz",
  ],
  Array [
    "foo",
    "baz",
  ],
  Array [
    "baz",
  ],
]
`);
    });
  });
});

describe('stop', () => {
  it('completes applicationClass$, isCollapsed$, isVisible$, and brand$ observables', async () => {
    const service = new ChromeService();
    const start = service.start();
    const promise = Rx.combineLatest(
      start.getBrand$(),
      start.getApplicationClasses$(),
      start.getIsCollapsed$(),
      start.getIsVisible$()
    ).toPromise();

    service.stop();
    await promise;
  });

  it('completes immediately if service already stopped', async () => {
    const service = new ChromeService();
    const start = service.start();
    service.stop();

    await expect(
      Rx.combineLatest(
        start.getBrand$(),
        start.getApplicationClasses$(),
        start.getIsCollapsed$(),
        start.getIsVisible$()
      ).toPromise()
    ).resolves.toBe(undefined);
  });
});
