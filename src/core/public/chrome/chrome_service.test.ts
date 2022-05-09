/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';
import { App, PublicAppInfo } from '../application';
import { applicationServiceMock } from '../application/application_service.mock';
import { docLinksServiceMock } from '../doc_links/doc_links_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { notificationServiceMock } from '../notifications/notifications_service.mock';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { ChromeService } from './chrome_service';
import { getAppInfo } from '../application/utils';

class FakeApp implements App {
  public title: string;
  public mount = () => () => {};

  constructor(public id: string, public chromeless?: boolean) {
    this.title = `${this.id} App`;
  }
}

const store = new Map();
const originalLocalStorage = window.localStorage;

(window as any).localStorage = {
  setItem: (key: string, value: string) => store.set(String(key), String(value)),
  getItem: (key: string) => store.get(String(key)),
  removeItem: (key: string) => store.delete(String(key)),
};

function defaultStartDeps(availableApps?: App[]) {
  const deps = {
    application: applicationServiceMock.createInternalStartContract(),
    docLinks: docLinksServiceMock.createStartContract(),
    http: httpServiceMock.createStartContract(),
    injectedMetadata: injectedMetadataServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
  };

  if (availableApps) {
    deps.application.applications$ = new Rx.BehaviorSubject<Map<string, PublicAppInfo>>(
      new Map(availableApps.map((app) => [app.id, getAppInfo(app) as PublicAppInfo]))
    );
  }

  return deps;
}

function defaultStartTestOptions({
  browserSupportsCsp = true,
  kibanaVersion = 'version',
}: {
  browserSupportsCsp?: boolean;
  kibanaVersion?: string;
}): any {
  return {
    browserSupportsCsp,
    kibanaVersion,
  };
}

async function start({
  options = defaultStartTestOptions({}),
  cspConfigMock = { warnLegacyBrowsers: true },
  startDeps = defaultStartDeps(),
}: { options?: any; cspConfigMock?: any; startDeps?: ReturnType<typeof defaultStartDeps> } = {}) {
  const service = new ChromeService(options);

  if (cspConfigMock) {
    startDeps.injectedMetadata.getCspConfig.mockReturnValue(cspConfigMock);
  }

  return {
    service,
    startDeps,
    chrome: await service.start(startDeps),
  };
}

beforeEach(() => {
  store.clear();
  window.history.pushState(undefined, '', '#/home?a=b');
});

afterAll(() => {
  (window as any).localStorage = originalLocalStorage;
});

describe('start', () => {
  it('adds legacy browser warning if browserSupportsCsp is disabled and warnLegacyBrowsers is enabled', async () => {
    const { startDeps } = await start({
      options: { browserSupportsCsp: false, kibanaVersion: '7.0.0' },
    });

    expect(startDeps.notifications.toasts.addWarning.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "title": [Function],
          },
        ],
      ]
    `);
  });

  it('adds the kibana versioned class to the document body', async () => {
    const { chrome, service } = await start({
      options: { browserSupportsCsp: false, kibanaVersion: '1.2.3' },
    });
    const promise = chrome.getBodyClasses$().pipe(toArray()).toPromise();
    service.stop();
    await expect(promise).resolves.toMatchInlineSnapshot(`
            Array [
              Array [
                "kbnBody",
                "kbnBody--noHeaderBanner",
                "kbnBody--chromeHidden",
                "kbnVersion-1-2-3",
              ],
            ]
          `);
  });
  it('strips off "snapshot" from the kibana version if present', async () => {
    const { chrome, service } = await start({
      options: { browserSupportsCsp: false, kibanaVersion: '8.0.0-SnAPshot' },
    });
    const promise = chrome.getBodyClasses$().pipe(toArray()).toPromise();
    service.stop();
    await expect(promise).resolves.toMatchInlineSnapshot(`
            Array [
              Array [
                "kbnBody",
                "kbnBody--noHeaderBanner",
                "kbnBody--chromeHidden",
                "kbnVersion-8-0-0",
              ],
            ]
          `);
  });

  it('does not add legacy browser warning if browser supports CSP', async () => {
    const { startDeps } = await start();

    expect(startDeps.notifications.toasts.addWarning).not.toBeCalled();
  });

  it('does not add legacy browser warning if warnLegacyBrowsers is disabled', async () => {
    const { startDeps } = await start({
      options: { browserSupportsCsp: false },
      cspConfigMock: { warnLegacyBrowsers: false },
    });

    expect(startDeps.notifications.toasts.addWarning).not.toBeCalled();
  });

  describe('getComponent', () => {
    it('returns a renderable React component', async () => {
      const { chrome } = await start();

      // Have to do some fanagling to get the type system and enzyme to accept this.
      // Don't capture the snapshot because it's 600+ lines long.
      expect(shallow(React.createElement(() => chrome.getHeaderComponent()))).toBeDefined();
    });
  });

  describe('visibility', () => {
    it('emits false when no application is mounted', async () => {
      const { chrome, service } = await start();
      const promise = chrome.getIsVisible$().pipe(toArray()).toPromise();

      chrome.setIsVisible(true);
      chrome.setIsVisible(false);
      chrome.setIsVisible(true);
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

    it('emits false until manually overridden when in embed mode', async () => {
      window.history.pushState(undefined, '', '#/home?a=b&embed=true');
      const startDeps = defaultStartDeps([new FakeApp('alpha')]);
      const { navigateToApp } = startDeps.application;
      const { chrome, service } = await start({ startDeps });

      const promise = chrome.getIsVisible$().pipe(toArray()).toPromise();

      await navigateToApp('alpha');

      chrome.setIsVisible(true);
      chrome.setIsVisible(false);

      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
                      Array [
                        false,
                        false,
                        true,
                        false,
                      ]
                  `);
    });

    it('application-specified visibility on mount', async () => {
      const startDeps = defaultStartDeps([
        new FakeApp('alpha'), // An undefined `chromeless` is the same as setting to false.
        new FakeApp('beta', true),
        new FakeApp('gamma', false),
      ]);
      const { applications$, navigateToApp } = startDeps.application;
      const { chrome, service } = await start({ startDeps });
      const promise = chrome.getIsVisible$().pipe(toArray()).toPromise();

      const availableApps = await Rx.firstValueFrom(applications$);
      [...availableApps.keys()].forEach((appId) => navigateToApp(appId));
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

    it('changing visibility has no effect on chrome-hiding application', async () => {
      const startDeps = defaultStartDeps([new FakeApp('alpha', true)]);
      const { navigateToApp } = startDeps.application;
      const { chrome, service } = await start({ startDeps });
      const promise = chrome.getIsVisible$().pipe(toArray()).toPromise();

      await navigateToApp('alpha');
      chrome.setIsVisible(true);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
                      Array [
                        false,
                        false,
                        false,
                      ]
                  `);
    });
  });

  describe('badge', () => {
    it('updates/emits the current badge', async () => {
      const { chrome, service } = await start();
      const promise = chrome.getBadge$().pipe(toArray()).toPromise();

      chrome.setBadge({ text: 'foo', tooltip: `foo's tooltip` });
      chrome.setBadge({ text: 'bar', tooltip: `bar's tooltip` });
      chrome.setBadge(undefined);
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
      const { chrome, service } = await start();
      const promise = chrome.getBreadcrumbs$().pipe(toArray()).toPromise();

      chrome.setBreadcrumbs([{ text: 'foo' }, { text: 'bar' }]);
      chrome.setBreadcrumbs([{ text: 'foo' }]);
      chrome.setBreadcrumbs([{ text: 'bar' }]);
      chrome.setBreadcrumbs([]);
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

  describe('breadcrumbsAppendExtension$', () => {
    it('updates the breadcrumbsAppendExtension$', async () => {
      const { chrome, service } = await start();
      const promise = chrome.getBreadcrumbsAppendExtension$().pipe(toArray()).toPromise();

      chrome.setBreadcrumbsAppendExtension({
        content: (element) => () => {},
      });
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
              Array [
                undefined,
                Object {
                  "content": [Function],
                },
              ]
            `);
    });
  });

  describe('custom nav link', () => {
    it('updates/emits the current custom nav link', async () => {
      const { chrome, service } = await start();
      const promise = chrome.getCustomNavLink$().pipe(toArray()).toPromise();

      chrome.setCustomNavLink({ title: 'Manage cloud deployment' });
      chrome.setCustomNavLink(undefined);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
              Array [
                undefined,
                Object {
                  "title": "Manage cloud deployment",
                },
                undefined,
              ]
            `);
    });
  });

  describe('help extension', () => {
    it('updates/emits the current help extension', async () => {
      const { chrome, service } = await start();
      const promise = chrome.getHelpExtension$().pipe(toArray()).toPromise();

      chrome.setHelpExtension({ appName: 'App name', content: () => () => undefined });
      chrome.setHelpExtension(undefined);
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
              Array [
                undefined,
                Object {
                  "appName": "App name",
                  "content": [Function],
                },
                undefined,
              ]
            `);
    });
  });

  describe('header banner', () => {
    it('updates/emits the state of the header banner', async () => {
      const { chrome, service } = await start();
      const promise = chrome.hasHeaderBanner$().pipe(toArray()).toPromise();

      chrome.setHeaderBanner({ content: () => () => undefined });
      chrome.setHeaderBanner(undefined);
      service.stop();

      await expect(promise).resolves.toEqual([false, true, false]);
    });
  });

  describe('erase chrome fields', () => {
    it('while switching an app', async () => {
      const startDeps = defaultStartDeps([new FakeApp('alpha')]);
      const { navigateToApp } = startDeps.application;
      const { chrome, service } = await start({ startDeps });

      const helpExtensionPromise = chrome.getHelpExtension$().pipe(toArray()).toPromise();
      const breadcrumbsPromise = chrome.getBreadcrumbs$().pipe(toArray()).toPromise();
      const badgePromise = chrome.getBadge$().pipe(toArray()).toPromise();
      const docTitleResetSpy = jest.spyOn(chrome.docTitle, 'reset');

      const promises = Promise.all([helpExtensionPromise, breadcrumbsPromise, badgePromise]);

      chrome.setHelpExtension({ appName: 'App name' });
      chrome.setBreadcrumbs([{ text: 'App breadcrumb' }]);
      chrome.setBadge({ text: 'App badge', tooltip: 'App tooltip' });

      navigateToApp('alpha');

      service.stop();

      expect(docTitleResetSpy).toBeCalledTimes(1);
      await expect(promises).resolves.toMatchInlineSnapshot(`
                      Array [
                        Array [
                          undefined,
                          Object {
                            "appName": "App name",
                          },
                          undefined,
                        ],
                        Array [
                          Array [],
                          Array [
                            Object {
                              "text": "App breadcrumb",
                            },
                          ],
                          Array [],
                        ],
                        Array [
                          undefined,
                          Object {
                            "text": "App badge",
                            "tooltip": "App tooltip",
                          },
                          undefined,
                        ],
                      ]
                  `);
    });
  });
});

describe('stop', () => {
  it('completes applicationClass$, getIsNavDrawerLocked, breadcrumbs$, isVisible$, and brand$ observables', async () => {
    const { chrome, service } = await start();
    const promise = Rx.combineLatest([
      chrome.getIsNavDrawerLocked$(),
      chrome.getBreadcrumbs$(),
      chrome.getIsVisible$(),
      chrome.getHelpExtension$(),
    ]).toPromise();

    service.stop();
    await promise;
  });

  it('completes immediately if service already stopped', async () => {
    const { chrome, service } = await start();
    service.stop();

    await expect(
      Rx.combineLatest([
        chrome.getIsNavDrawerLocked$(),
        chrome.getBreadcrumbs$(),
        chrome.getIsVisible$(),
        chrome.getHelpExtension$(),
      ]).toPromise()
    ).resolves.toBe(undefined);
  });
});
