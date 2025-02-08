/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerAnalyticsContextProviderMock } from './chrome_service.test.mocks';
import { shallow, mount } from 'enzyme';
import React from 'react';
import * as Rx from 'rxjs';
import { toArray, firstValueFrom } from 'rxjs';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import type { App, PublicAppInfo } from '@kbn/core-application-browser';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { getAppInfo } from '@kbn/core-application-browser-internal';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { findTestSubject } from '@kbn/test-jest-helpers';
import { ChromeService } from './chrome_service';

const mockhandleSystemColorModeChange = jest.fn();

jest.mock('./handle_system_colormode_change', () => {
  return {
    handleSystemColorModeChange: (...args: any[]) => mockhandleSystemColorModeChange(...args),
  };
});

class FakeApp implements App {
  public title: string;
  public mount = () => () => {};

  constructor(public id: string, public chromeless?: boolean) {
    this.title = `${this.id} App`;
  }
}

const store = new Map();
const originalLocalStorage = window.localStorage;

Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: (key: string, value: string) => store.set(String(key), String(value)),
    getItem: (key: string) => store.get(String(key)),
    removeItem: (key: string) => store.delete(String(key)),
  },
  writable: true,
});

function defaultStartDeps(availableApps?: App[], currentAppId?: string) {
  const deps = {
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    i18n: i18nServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    userProfile: userProfileServiceMock.createStart(),
    application: applicationServiceMock.createInternalStartContract(currentAppId),
    docLinks: docLinksServiceMock.createStartContract(),
    http: httpServiceMock.createStartContract(),
    injectedMetadata: injectedMetadataServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    customBranding: customBrandingServiceMock.createStartContract(),
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
    coreContext: coreContextMock.create(),
  };
}

async function start({
  options = defaultStartTestOptions({}),
  cspConfigMock = { warnLegacyBrowsers: true },
  startDeps = defaultStartDeps(),
}: { options?: any; cspConfigMock?: any; startDeps?: ReturnType<typeof defaultStartDeps> } = {}) {
  const service = new ChromeService({
    ...options,
    coreContext: options.coreContext ?? coreContextMock.create(),
  });

  if (cspConfigMock) {
    startDeps.injectedMetadata.getCspConfig.mockReturnValue(cspConfigMock);
  }

  service.setup({ analytics: analyticsServiceMock.createAnalyticsServiceSetup() });
  const chromeStart = await service.start(startDeps);

  return {
    service,
    startDeps,
    chrome: chromeStart,
  };
}

beforeEach(() => {
  store.clear();
  registerAnalyticsContextProviderMock.mockReset();
  window.history.pushState(undefined, '', '#/home?a=b');
});

afterAll(() => {
  (window as any).localStorage = originalLocalStorage;
});

describe('setup', () => {
  it('calls registerAnalyticsContextProvider with the correct parameters', async () => {
    const service = new ChromeService(defaultStartTestOptions({}));
    const analytics = analyticsServiceMock.createAnalyticsServiceSetup();
    service.setup({ analytics });

    expect(registerAnalyticsContextProviderMock).toHaveBeenCalledTimes(1);
    expect(registerAnalyticsContextProviderMock).toHaveBeenCalledWith(
      analytics,
      expect.any(Object)
    );
  });
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

  it('calls handleSystemColorModeChange() with the correct parameters', async () => {
    mockhandleSystemColorModeChange.mockReset();
    await start();
    expect(mockhandleSystemColorModeChange).toHaveBeenCalledTimes(1);

    const [firstCallArg] = mockhandleSystemColorModeChange.mock.calls[0];
    expect(Object.keys(firstCallArg).sort()).toEqual([
      'coreStart',
      'http',
      'notifications',
      'stop$',
      'uiSettings',
    ]);

    expect(mockhandleSystemColorModeChange).toHaveBeenCalledWith({
      http: expect.any(Object),
      coreStart: expect.any(Object),
      uiSettings: expect.any(Object),
      notifications: expect.any(Object),
      stop$: expect.any(Object),
    });
  });

  describe('getHeaderComponent', () => {
    it('returns a renderable React component', async () => {
      const { chrome } = await start();

      // Have to do some fanagling to get the type system and enzyme to accept this.
      // Don't capture the snapshot because it's 600+ lines long.
      expect(shallow(React.createElement(() => chrome.getHeaderComponent()))).toBeDefined();
    });

    it('renders the custom project side navigation', async () => {
      const { chrome, startDeps } = await start({
        startDeps: defaultStartDeps([{ id: 'foo', title: 'Foo' } as App], 'foo'),
      });

      const MyNav = function MyNav() {
        return <div data-test-subj="customProjectSideNav">HELLO</div>;
      };
      chrome.setChromeStyle('project');
      chrome.project.setSideNavComponent(MyNav);

      const component = mount(
        <KibanaRenderContextProvider {...startDeps}>
          {chrome.getHeaderComponent()}
        </KibanaRenderContextProvider>
      );

      const projectHeader = findTestSubject(component, 'kibanaProjectHeader');
      expect(projectHeader.length).toBe(1);

      const defaultProjectSideNav = findTestSubject(component, 'defaultProjectSideNav');
      expect(defaultProjectSideNav.length).toBe(0); // Default side nav not mounted

      const customProjectSideNav = findTestSubject(component, 'customProjectSideNav');
      expect(customProjectSideNav.text()).toBe('HELLO');
    });

    it('renders chromeless header', async () => {
      const { chrome, startDeps } = await start({ startDeps: defaultStartDeps() });

      chrome.setIsVisible(false);

      const component = mount(
        <KibanaRenderContextProvider {...startDeps}>
          {chrome.getHeaderComponent()}
        </KibanaRenderContextProvider>
      );

      const chromeless = findTestSubject(component, 'kibanaHeaderChromeless');
      expect(chromeless.length).toBe(1);
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

    it('change visibility when EUI component in full screen', async () => {
      const body = document.body;
      const startDeps = defaultStartDeps([new FakeApp('foo')], 'foo');
      const { chrome } = await start({ startDeps });

      // Chrome is initially visible
      let isVisible = await Rx.lastValueFrom(chrome.getIsVisible$().pipe(Rx.take(1)));
      expect(isVisible).toBe(true);

      // Add EUI class that should hide the chrome
      body.classList.add('euiDataGrid__restrictBody');
      await new Promise((resolve) => setTimeout(resolve)); // wait next tick

      // Chrome should be hidden
      isVisible = await Rx.lastValueFrom(chrome.getIsVisible$().pipe(Rx.take(1)));
      expect(isVisible).toBe(false);
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
      const promise = firstValueFrom(chrome.getBreadcrumbs$().pipe(toArray()));

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

    it('allows the project breadcrumb to also be set', async () => {
      const { chrome } = await start();

      chrome.setBreadcrumbs([{ text: 'foo' }, { text: 'bar' }]); // only setting the classic breadcrumbs

      {
        const breadcrumbs = await firstValueFrom(chrome.project.getBreadcrumbs$());
        expect(breadcrumbs.length).toBe(1);
        expect(breadcrumbs[0]).toMatchObject({
          'data-test-subj': 'deploymentCrumb',
        });
      }

      chrome.setBreadcrumbs([{ text: 'foo' }, { text: 'bar' }], {
        project: { value: [{ text: 'baz' }] }, // also setting the project breadcrumb
      });

      {
        const breadcrumbs = await firstValueFrom(chrome.project.getBreadcrumbs$());
        expect(breadcrumbs.length).toBe(2);
        expect(breadcrumbs[0]).toMatchObject({
          'data-test-subj': 'deploymentCrumb',
        });
        expect(breadcrumbs[1]).toEqual({
          text: 'baz', // the project breadcrumb
        });
      }
    });
  });

  describe('breadcrumbsAppendExtension$', () => {
    it('updates the breadcrumbsAppendExtension$', async () => {
      const { chrome, service } = await start();
      const promise = chrome.getBreadcrumbsAppendExtensions$().pipe(toArray()).toPromise();

      const ext1 = chrome.setBreadcrumbsAppendExtension({
        content: () => () => {},
      });
      chrome.setBreadcrumbsAppendExtension({
        order: 0,
        content: () => () => {},
      });
      const ext3 = chrome.setBreadcrumbsAppendExtension({
        order: 100,
        content: () => () => {},
      });
      ext3();
      ext1();
      service.stop();

      await expect(promise).resolves.toMatchInlineSnapshot(`
        Array [
          Array [],
          Array [
            Object {
              "content": [Function],
            },
          ],
          Array [
            Object {
              "content": [Function],
              "order": 0,
            },
            Object {
              "content": [Function],
            },
          ],
          Array [
            Object {
              "content": [Function],
              "order": 0,
            },
            Object {
              "content": [Function],
            },
            Object {
              "content": [Function],
              "order": 100,
            },
          ],
          Array [
            Object {
              "content": [Function],
              "order": 0,
            },
            Object {
              "content": [Function],
            },
          ],
          Array [
            Object {
              "content": [Function],
              "order": 0,
            },
          ],
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

  describe('side nav', () => {
    describe('isCollapsed$', () => {
      it('should return false by default', async () => {
        const { chrome, service } = await start();
        const isCollapsed = await firstValueFrom(chrome.sideNav.getIsCollapsed$());
        service.stop();
        expect(isCollapsed).toBe(false);
      });

      it('should read the localStorage value', async () => {
        store.set('core.chrome.isSideNavCollapsed', 'true');
        const { chrome, service } = await start();
        const isCollapsed = await firstValueFrom(chrome.sideNav.getIsCollapsed$());
        service.stop();
        expect(isCollapsed).toBe(true);
      });
    });

    describe('setIsCollapsed', () => {
      it('should update the isCollapsed$ observable', async () => {
        const { chrome, service } = await start();
        const isCollapsed$ = chrome.sideNav.getIsCollapsed$();
        const isCollapsed = await firstValueFrom(isCollapsed$);

        chrome.sideNav.setIsCollapsed(!isCollapsed);

        const updatedIsCollapsed = await firstValueFrom(isCollapsed$);
        service.stop();
        expect(updatedIsCollapsed).toBe(!isCollapsed);
      });
    });

    describe('getIsFeedbackBtnVisible$', () => {
      it('should return false by default', async () => {
        const { chrome, service } = await start();
        const isCollapsed = await firstValueFrom(chrome.sideNav.getIsFeedbackBtnVisible$());
        service.stop();
        expect(isCollapsed).toBe(false);
      });

      it('should return "false" when the sidenav is collapsed', async () => {
        const { chrome, service } = await start();

        const isFeedbackBtnVisible$ = chrome.sideNav.getIsFeedbackBtnVisible$();
        chrome.sideNav.setIsFeedbackBtnVisible(true); // Mark it as visible
        chrome.sideNav.setIsCollapsed(true); // But the sidenav is collapsed

        const isFeedbackBtnVisible = await firstValueFrom(isFeedbackBtnVisible$);
        service.stop();
        expect(isFeedbackBtnVisible).toBe(false);
      });
    });

    describe('setIsFeedbackBtnVisible', () => {
      it('should update the isFeedbackBtnVisible$ observable', async () => {
        const { chrome, service } = await start();
        const isFeedbackBtnVisible$ = chrome.sideNav.getIsFeedbackBtnVisible$();
        const isFeedbackBtnVisible = await firstValueFrom(isFeedbackBtnVisible$);

        chrome.sideNav.setIsFeedbackBtnVisible(!isFeedbackBtnVisible);

        const updatedIsFeedbackBtnVisible = await firstValueFrom(isFeedbackBtnVisible$);
        service.stop();
        expect(updatedIsFeedbackBtnVisible).toBe(!isFeedbackBtnVisible);
      });
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
