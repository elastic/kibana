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

const MockPrefixedStorage = jest.fn(() => new Map());
jest.mock('./prefixed_storage', () => ({
  PrefixedStorage: MockPrefixedStorage,
}));

import * as Rx from 'rxjs';
import { map, take, toArray } from 'rxjs/operators';

import { InjectedMetadataParams } from '../injected_metadata';
import { NavLink, NavLinksService } from './nav_links_service';

const FOO_NAV_LINK = {
  description: 'foo',
  disabled: false,
  hidden: true,
  icon: 'foo.svg',
  id: 'foo',
  linkToLastSubUrl: true,
  order: 599,
  subUrlBase: '/abc#/foo',
  title: 'Foo',
  tooltip: 'Foo',
  url: '/abc#/foo',
};

const BAR_NAV_LINK = {
  description: 'bar',
  disabled: false,
  hidden: false,
  icon: 'bar.svg',
  id: 'bar',
  linkToLastSubUrl: true,
  order: 599,
  subUrlBase: '/abc#/bar',
  title: 'Bar',
  tooltip: 'Bar',
  url: '/abc#/bar',
};

const createdServices: NavLinksService[] = [];

function setup({
  navLinks = [],
}: {
  navLinks?: InjectedMetadataParams['injectedMetadata']['navLinks'];
} = {}) {
  const injectedMetadata = {
    getNavLinks: jest.fn().mockReturnValue(navLinks),
  };

  const service = new NavLinksService();
  const start = service.start({
    injectedMetadata: injectedMetadata as any,
    basePath: {
      get: () => '/abc',
      addToPath: (path: string) => `/abc${path}`,
    } as any,
  });

  expect(MockPrefixedStorage.mock.results).toHaveLength(1);
  const [{ value: lastUrlStore }] = MockPrefixedStorage.mock.results;

  // create a promise that resolves to an array of arrays containing a summary
  // for each navLink that was emitted by the navLinksService until it stopped
  function summarize(...keys: Array<keyof NavLink>) {
    return start
      .get$()
      .pipe(
        map(nls =>
          nls.map(navLink =>
            keys
              .map(key => {
                if (key === 'active' || key === 'disabled' || key === 'hidden') {
                  return navLink[key] ? key : '-';
                }

                return navLink[key];
              })
              .join(':')
          )
        ),
        toArray()
      )
      .toPromise();
  }

  createdServices.push(service);
  return { service, start, injectedMetadata, summarize, lastUrlStore };
}

async function changeHash(newHash: string) {
  window.location.hash = newHash;
  await Rx.fromEvent(window, 'hashchange')
    .pipe(take(1))
    .toPromise();
}

beforeEach(() => {
  window.history.pushState(undefined, '', '/abc#/');
});

afterEach(() => {
  while (createdServices.length) {
    createdServices.shift()!.stop();
  }
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('start.get$()', () => {
  it('returns an observable of navLink objects that completes when the service is stopped', async () => {
    const { service, start } = setup();
    const observable = start.get$();
    const promise = observable.toPromise();
    expect(observable).toBeInstanceOf(Rx.Observable);
    service.stop();
    await expect(promise).resolves.toEqual([]);
  });

  it('includes the navLinks from the injectedMetadata', async () => {
    const { service, start } = setup({
      navLinks: [FOO_NAV_LINK],
    });

    const observable = start.get$();
    const promise = observable.toPromise();
    expect(observable).toBeInstanceOf(Rx.Observable);
    service.stop();
    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Object {
    "active": false,
    "description": "foo",
    "disabled": false,
    "hidden": true,
    "icon": "http://localhost/abc/foo.svg",
    "id": "foo",
    "lastSubUrl": undefined,
    "linkToLastSubUrl": true,
    "order": 599,
    "subUrlBase": "http://localhost/abc#/foo",
    "title": "Foo",
    "tooltip": "Foo",
    "url": "http://localhost/abc#/foo",
  },
]
`);
  });

  it('updates when the URL changes', async () => {
    const { service, summarize } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });

    const promise = summarize('id', 'active', 'lastSubUrl');

    await changeHash('#/bar/baz/box');
    await changeHash('#/foo/1/2/3');
    await changeHash('#/abc');
    service.stop();

    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:-:",
    "bar:-:",
  ],
  Array [
    "foo:-:",
    "bar:active:http://localhost/abc#/bar/baz/box",
  ],
  Array [
    "foo:active:http://localhost/abc#/foo/1/2/3",
    "bar:-:http://localhost/abc#/bar/baz/box",
  ],
  Array [
    "foo:-:http://localhost/abc#/foo/1/2/3",
    "bar:-:http://localhost/abc#/bar/baz/box",
  ],
]
`);
  });

  it('does not update when url changes via history.pushState()', async () => {
    const { service, summarize } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });

    const promise = summarize('id', 'active', 'lastSubUrl');

    await changeHash('#/bar/baz/box');
    window.history.pushState(undefined, '', '/abc#/foo/1');
    service.stop();

    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:-:",
    "bar:-:",
  ],
  Array [
    "foo:-:",
    "bar:active:http://localhost/abc#/bar/baz/box",
  ],
]
`);
  });

  it('does update when url changed via history.pushState() and checkCurrentUrl() is called', async () => {
    const { service, start, summarize } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });

    const promise = summarize('id', 'active', 'lastSubUrl');

    await changeHash('#/bar/baz/box');
    window.history.pushState(undefined, '', '/abc#/foo/1');
    start.checkCurrentUrl();
    service.stop();

    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:-:",
    "bar:-:",
  ],
  Array [
    "foo:-:",
    "bar:active:http://localhost/abc#/bar/baz/box",
  ],
  Array [
    "foo:active:http://localhost/abc#/foo/1",
    "bar:-:http://localhost/abc#/bar/baz/box",
  ],
]
`);
  });
});

describe('start.getLastUrl()', () => {
  it('gets the most recent lastUrl', async () => {
    const { start } = setup({ navLinks: [FOO_NAV_LINK] });

    start.setLastUrl('foo', 'http://localhost/abc#/foo/1234');
    expect(start.getLastUrl('foo')).toBe('http://localhost/abc#/foo/1234');
    await changeHash('#/foo/5678');
    expect(start.getLastUrl('foo')).toBe('http://localhost/abc#/foo/5678');
  });

  it('returns undefined for unknown ids', () => {
    const { start } = setup({
      navLinks: [],
    });

    expect(start.getLastUrl('foo')).toBe(undefined);
  });
});

describe('start.setLastUrl()', () => {
  it('triggers update, even if navLink is active', async () => {
    const { start, service, summarize } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });
    await changeHash('#/foo/1234');

    const promise = summarize('id', 'active', 'lastSubUrl');
    start.setLastUrl('foo', 'http://localhost/abc#/foo/5678');
    start.setLastUrl('bar', 'http://localhost/abc#/bar/5678');
    service.stop();

    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:active:http://localhost/abc#/foo/1234",
    "bar:-:",
  ],
  Array [
    "foo:active:http://localhost/abc#/foo/5678",
    "bar:-:",
  ],
  Array [
    "foo:active:http://localhost/abc#/foo/5678",
    "bar:-:http://localhost/abc#/bar/5678",
  ],
]
`);
  });

  it('writes lastUrl to sessionStorage', () => {
    const { start, lastUrlStore } = setup({ navLinks: [FOO_NAV_LINK] });
    start.setLastUrl('foo', 'http://localhost/abc#/foo/1234');
    expect(lastUrlStore).toMatchInlineSnapshot(`
Map {
  "foo" => "http://localhost/abc#/foo/1234",
}
`);
  });
});

describe('start.getDefaultUrl()', () => {
  it('returns the url property from the injected navLink', () => {
    const { start } = setup({ navLinks: [FOO_NAV_LINK] });
    expect(start.getDefaultUrl('foo')).toBe('http://localhost/abc#/foo');
  });

  it('returns undefined for unknown id', () => {
    const { start } = setup();
    expect(start.getDefaultUrl('foo')).toBe(undefined);
  });
});

describe('start.showOnly()', () => {
  it('triggers update with all but this id active, none if id is unknown', async () => {
    const { start, summarize, service } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });
    const promise = summarize('id', 'hidden');
    start.showOnly('foo');
    start.showOnly('bar');
    start.showOnly('baz');
    service.stop();
    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:hidden",
    "bar:-",
  ],
  Array [
    "foo:-",
    "bar:hidden",
  ],
  Array [
    "foo:hidden",
    "bar:-",
  ],
  Array [
    "foo:hidden",
    "bar:hidden",
  ],
]
`);
  });
});

describe('start.filterLastUrl()', () => {
  it('calls condition function once for each navLink that has a lastUrl', () => {
    const { start } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });
    start.setLastUrl('bar', 'http://localhost/abc#/bar/1234');
    const stub = jest.fn();
    start.filterLastUrls(stub);
    expect(stub).toHaveBeenCalledTimes(1);
    expect(stub.mock.calls[0][1]).toBe('bar');
  });

  it('removes lastUrl if condition returns false', () => {
    const { start, lastUrlStore } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });
    start.setLastUrl('foo', 'http://localhost/abc#/foo/1234');
    start.setLastUrl('bar', 'http://localhost/abc#/bar/1234');

    expect(lastUrlStore.size).toBe(2);
    start.filterLastUrls(lastUrl => lastUrl.includes('/foo/'));
    expect(lastUrlStore.size).toBe(1);
  });

  it('only triggers one update if multiple lastUrls are removed', async () => {
    const { start, service, summarize } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });
    start.setLastUrl('foo', 'http://localhost/abc#/foo/1234');
    start.setLastUrl('bar', 'http://localhost/abc#/bar/1234');

    const promise = summarize('id', 'lastSubUrl');
    start.filterLastUrls(() => false);
    service.stop();

    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:http://localhost/abc#/foo/1234",
    "bar:http://localhost/abc#/bar/1234",
  ],
  Array [
    "foo:",
    "bar:",
  ],
]
`);
  });
});

describe('start.setUrlInterceptor()', () => {
  it('calls interceptor when added to check current url', () => {
    const { start } = setup();
    const stub = jest.fn();
    start.setUrlInterceptor(stub);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('does not update lastUrl if interceptor returns undefined', async () => {
    const { start, service, summarize } = setup({ navLinks: [FOO_NAV_LINK] });

    const promise = summarize('id', 'active');
    start.setUrlInterceptor(() => undefined);
    await changeHash('#/foo/1234');
    service.stop();

    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:-",
  ],
]
`);
  });

  it('uses alternate url returned from url interceptor', async () => {
    const { start, service, summarize } = setup({ navLinks: [FOO_NAV_LINK, BAR_NAV_LINK] });

    const promise = summarize('id', 'active', 'lastSubUrl');
    start.setUrlInterceptor(lastUrl => lastUrl.replace('/foo/', '/bar/'));
    await changeHash('#/foo/5678');
    service.stop();
    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:-:",
    "bar:-:",
  ],
  Array [
    "foo:-:",
    "bar:-:",
  ],
  Array [
    "foo:-:",
    "bar:active:http://localhost/abc#/bar/5678",
  ],
]
`);
  });
});

describe('start.decorate()', () => {
  it('triggers updates that include decorations, even if id unknown', async () => {
    const { service, start, summarize } = setup({ navLinks: [FOO_NAV_LINK] });
    const promise = summarize('id', 'disabled');

    start.decorate('foo', { disabled: true });
    start.decorate('bar', { disabled: true });
    service.stop();

    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "foo:-",
  ],
  Array [
    "foo:disabled",
  ],
  Array [
    "foo:disabled",
  ],
]
`);
  });

  it('merges with previous decorations', async () => {
    const { service, start, summarize } = setup({ navLinks: [BAR_NAV_LINK] });
    const promise = summarize('id', 'hidden', 'disabled');

    start.decorate('bar', { hidden: true });
    start.decorate('bar', { disabled: true });
    start.decorate('bar', { disabled: false });
    start.decorate('bar', { hidden: false });
    service.stop();

    await expect(promise).resolves.toMatchInlineSnapshot(`
Array [
  Array [
    "bar:-:-",
  ],
  Array [
    "bar:hidden:-",
  ],
  Array [
    "bar:hidden:disabled",
  ],
  Array [
    "bar:hidden:-",
  ],
  Array [
    "bar:-:-",
  ],
]
`);
  });
});

describe('#stop()', () => {
  it('completes get$() observables', () => {
    const { service, start } = setup();
    const complete = jest.fn();
    start.get$().subscribe({ complete });
    expect(complete).not.toHaveBeenCalled();
    service.stop();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('stops listening to window `hashchange` and `popstate` events', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { service } = setup();
    expect(addSpy.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "hashchange",
    [Function],
    undefined,
  ],
]
`);
    expect(removeSpy).not.toHaveBeenCalled();

    service.stop();

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "hashchange",
    [Function],
    undefined,
  ],
]
`);
  });
});
