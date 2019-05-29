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

import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { notificationServiceMock } from '../notifications/notifications_service.mock';

const store = new Map();
(window as any).localStorage = {
  setItem: (key: string, value: string) => store.set(String(key), String(value)),
  getItem: (key: string) => store.get(String(key)),
  removeItem: (key: string) => store.delete(String(key)),
};

import { ChromeService } from './chrome_service';

function defaultSetupDeps(): any {
  return {
    notifications: notificationServiceMock.createSetupContract(),
    injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
  };
}

beforeEach(() => {
  store.clear();
});

describe('setup', () => {
  it('adds legacy browser warning if browserSupportsCsp is disabled and warnLegacyBrowsers is enabled', () => {
    const service = new ChromeService({ browserSupportsCsp: false });
    const setupDeps = defaultSetupDeps();
    setupDeps.injectedMetadata.getCspConfig.mockReturnValue({ warnLegacyBrowsers: true });
    service.setup(setupDeps);
    expect(setupDeps.notifications.toasts.addWarning.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "Your browser does not meet the security requirements for Kibana.",
  ],
]
`);
  });

  it('does not add legacy browser warning if browser supports CSP', () => {
    const service = new ChromeService({ browserSupportsCsp: true });
    const setupDeps = defaultSetupDeps();
    setupDeps.injectedMetadata.getCspConfig.mockReturnValue({ warnLegacyBrowsers: true });
    service.setup(setupDeps);
    expect(setupDeps.notifications.toasts.addWarning).not.toBeCalled();
  });

  it('does not add legacy browser warning if warnLegacyBrowsers is disabled', () => {
    const service = new ChromeService({ browserSupportsCsp: false });
    const setupDeps = defaultSetupDeps();
    setupDeps.injectedMetadata.getCspConfig.mockReturnValue({ warnLegacyBrowsers: false });
    service.setup(setupDeps);
    expect(setupDeps.notifications.toasts.addWarning).not.toBeCalled();
  });

  describe('brand', () => {
    it('updates/emits the brand as it changes', async () => {
      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());
      const promise = setup
        .getBrand$()
        .pipe(toArray())
        .toPromise();

      setup.setBrand({
        logo: 'big logo',
        smallLogo: 'not so big logo',
      });
      setup.setBrand({
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
      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());
      const promise = setup
        .getIsVisible$()
        .pipe(toArray())
        .toPromise();

      setup.setIsVisible(true);
      setup.setIsVisible(false);
      setup.setIsVisible(true);
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

    it('always emits false if embed query string is in hash when set up', async () => {
      window.history.pushState(undefined, '', '#/home?a=b&embed=true');

      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());
      const promise = setup
        .getIsVisible$()
        .pipe(toArray())
        .toPromise();

      setup.setIsVisible(true);
      setup.setIsVisible(false);
      setup.setIsVisible(true);
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
      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());
      const promise = setup
        .getIsCollapsed$()
        .pipe(toArray())
        .toPromise();

      setup.setIsCollapsed(true);
      setup.setIsCollapsed(false);
      setup.setIsCollapsed(true);
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
      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());

      setup.setIsCollapsed(true);
      expect(store.size).toBe(1);

      setup.setIsCollapsed(false);
      expect(store.size).toBe(0);
    });
  });

  describe('application classes', () => {
    it('updates/emits the application classes', async () => {
      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());
      const promise = setup
        .getApplicationClasses$()
        .pipe(toArray())
        .toPromise();

      setup.addApplicationClass('foo');
      setup.addApplicationClass('foo');
      setup.addApplicationClass('bar');
      setup.addApplicationClass('bar');
      setup.addApplicationClass('baz');
      setup.removeApplicationClass('bar');
      setup.removeApplicationClass('foo');
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

  describe('badge', () => {
    it('updates/emits the current badge', async () => {
      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());
      const promise = setup
        .getBadge$()
        .pipe(toArray())
        .toPromise();

      setup.setBadge({ text: 'foo', tooltip: `foo's tooltip` });
      setup.setBadge({ text: 'bar', tooltip: `bar's tooltip` });
      setup.setBadge(undefined);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  undefined,
  Object {
    "text": "foo",
    "tooltip": "foo's tooltip",
  },
  Object {
    "text": "bar",
    "tooltip": "bar's tooltip",
  },
  undefined,
]
`);
    });
  });

  describe('breadcrumbs', () => {
    it('updates/emits the current set of breadcrumbs', async () => {
      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());
      const promise = setup
        .getBreadcrumbs$()
        .pipe(toArray())
        .toPromise();

      setup.setBreadcrumbs([{ text: 'foo' }, { text: 'bar' }]);
      setup.setBreadcrumbs([{ text: 'foo' }]);
      setup.setBreadcrumbs([{ text: 'bar' }]);
      setup.setBreadcrumbs([]);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [],
  Array [
    Object {
      "text": "foo",
    },
    Object {
      "text": "bar",
    },
  ],
  Array [
    Object {
      "text": "foo",
    },
  ],
  Array [
    Object {
      "text": "bar",
    },
  ],
  Array [],
]
`);
    });
  });

  describe('help extension', () => {
    it('updates/emits the current help extension', async () => {
      const service = new ChromeService({ browserSupportsCsp: true });
      const setup = service.setup(defaultSetupDeps());
      const promise = setup
        .getHelpExtension$()
        .pipe(toArray())
        .toPromise();

      setup.setHelpExtension(() => () => undefined);
      setup.setHelpExtension(undefined);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  undefined,
  [Function],
  undefined,
]
`);
    });
  });
});

describe('stop', () => {
  it('completes applicationClass$, isCollapsed$, breadcrumbs$, isVisible$, and brand$ observables', async () => {
    const service = new ChromeService({ browserSupportsCsp: true });
    const setup = service.setup(defaultSetupDeps());
    const promise = Rx.combineLatest(
      setup.getBrand$(),
      setup.getApplicationClasses$(),
      setup.getIsCollapsed$(),
      setup.getBreadcrumbs$(),
      setup.getIsVisible$(),
      setup.getHelpExtension$()
    ).toPromise();

    service.stop();
    await promise;
  });

  it('completes immediately if service already stopped', async () => {
    const service = new ChromeService({ browserSupportsCsp: true });
    const setup = service.setup(defaultSetupDeps());
    service.stop();

    await expect(
      Rx.combineLatest(
        setup.getBrand$(),
        setup.getApplicationClasses$(),
        setup.getIsCollapsed$(),
        setup.getBreadcrumbs$(),
        setup.getIsVisible$(),
        setup.getHelpExtension$()
      ).toPromise()
    ).resolves.toBe(undefined);
  });
});
