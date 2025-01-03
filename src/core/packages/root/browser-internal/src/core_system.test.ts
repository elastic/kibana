/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ChromeServiceConstructor,
  FatalErrorsServiceConstructor,
  HttpServiceConstructor,
  I18nServiceConstructor,
  InjectedMetadataServiceConstructor,
  MockChromeService,
  MockFatalErrorsService,
  MockHttpService,
  MockI18nService,
  MockInjectedMetadataService,
  MockNotificationsService,
  MockOverlayService,
  MockPluginsService,
  MockUiSettingsService,
  NotificationServiceConstructor,
  OverlayServiceConstructor,
  UiSettingsServiceConstructor,
  SettingsServiceConstructor,
  MockApplicationService,
  MockDocLinksService,
  MockRenderingService,
  RenderingServiceConstructor,
  IntegrationsServiceConstructor,
  MockIntegrationsService,
  CoreAppConstructor,
  MockCoreApp,
  MockThemeService,
  ThemeServiceConstructor,
  AnalyticsServiceConstructor,
  MockAnalyticsService,
  analyticsServiceStartMock,
  fetchOptionalMemoryInfoMock,
  MockLoggingSystem,
  LoggingSystemConstructor,
  MockSettingsService,
  MockCustomBrandingService,
  CustomBrandingServiceConstructor,
  MockSecurityService,
  SecurityServiceConstructor,
  MockUserProfileService,
  UserProfileServiceConstructor,
} from './core_system.test.mocks';
import type { EnvironmentMode } from '@kbn/config';
import { CoreSystem } from './core_system';
import {
  KIBANA_LOADED_EVENT,
  LOAD_START,
  LOAD_BOOTSTRAP_START,
  LOAD_CORE_CREATED,
  LOAD_FIRST_NAV,
  LOAD_SETUP_DONE,
  LOAD_START_DONE,
} from './events';

jest.spyOn(CoreSystem.prototype, 'stop');
(global.navigator as any).deviceMemory = 5;
jest.spyOn(global.navigator as any, 'hardwareConcurrency', 'get').mockReturnValue(4);

const defaultCoreSystemParams = {
  rootDomElement: document.createElement('div'),
  browserSupportsCsp: true,
  injectedMetadata: {
    uiPlugins: [],
    csp: {
      warnLegacyBrowsers: true,
    },
    env: {
      mode: {
        name: 'development',
        dev: true,
        prod: false,
      },
      packageInfo: {
        dist: false,
        version: '1.2.3',
      },
    },
    logging: {
      root: {
        level: 'debug',
      },
    },
    version: 'version',
  } as any,
};

beforeEach(() => {
  jest.clearAllMocks();
  MockPluginsService.getOpaqueIds.mockReturnValue(new Map());

  window.performance.mark = jest.fn();
  window.performance.clearMarks = jest.fn();
  window.performance.getEntriesByName = jest.fn().mockReturnValue([
    {
      detail: LOAD_START,
      startTime: 111,
    },
    {
      detail: LOAD_BOOTSTRAP_START,
      startTime: 222,
    },
    {
      detail: LOAD_CORE_CREATED,
      startTime: 333,
    },
    {
      detail: LOAD_SETUP_DONE,
      startTime: 444,
    },
    {
      detail: LOAD_START_DONE,
      startTime: 555,
    },
    {
      detail: LOAD_FIRST_NAV,
      startTime: 666,
    },
  ]);
});

function createCoreSystem(params = {}) {
  return new CoreSystem({
    ...defaultCoreSystemParams,
    ...params,
  });
}

describe('constructor', () => {
  it('creates instances of services', () => {
    createCoreSystem();

    expect(InjectedMetadataServiceConstructor).toHaveBeenCalledTimes(1);
    expect(I18nServiceConstructor).toHaveBeenCalledTimes(1);
    expect(FatalErrorsServiceConstructor).toHaveBeenCalledTimes(1);
    expect(NotificationServiceConstructor).toHaveBeenCalledTimes(1);
    expect(HttpServiceConstructor).toHaveBeenCalledTimes(1);
    expect(UiSettingsServiceConstructor).toHaveBeenCalledTimes(1);
    expect(SettingsServiceConstructor).toHaveBeenCalledTimes(1);
    expect(ChromeServiceConstructor).toHaveBeenCalledTimes(1);
    expect(OverlayServiceConstructor).toHaveBeenCalledTimes(1);
    expect(RenderingServiceConstructor).toHaveBeenCalledTimes(1);
    expect(IntegrationsServiceConstructor).toHaveBeenCalledTimes(1);
    expect(CoreAppConstructor).toHaveBeenCalledTimes(1);
    expect(ThemeServiceConstructor).toHaveBeenCalledTimes(1);
    expect(AnalyticsServiceConstructor).toHaveBeenCalledTimes(1);
    expect(LoggingSystemConstructor).toHaveBeenCalledTimes(1);
    expect(CustomBrandingServiceConstructor).toHaveBeenCalledTimes(1);
    expect(SecurityServiceConstructor).toHaveBeenCalledTimes(1);
    expect(UserProfileServiceConstructor).toHaveBeenCalledTimes(1);
  });

  it('passes injectedMetadata param to InjectedMetadataService', () => {
    const injectedMetadata = { env: { mode: { dev: true }, packageInfo: { dist: false } } } as any;

    createCoreSystem({
      injectedMetadata,
    });

    expect(InjectedMetadataServiceConstructor).toHaveBeenCalledTimes(1);
    expect(InjectedMetadataServiceConstructor).toHaveBeenCalledWith({
      injectedMetadata,
    });
  });

  it('passes browserSupportsCsp and coreContext to ChromeService', () => {
    createCoreSystem();
    expect(ChromeServiceConstructor).toHaveBeenCalledTimes(1);
    expect(ChromeServiceConstructor).toHaveBeenCalledWith({
      browserSupportsCsp: true,
      kibanaVersion: 'version',
      coreContext: expect.any(Object),
    });
  });

  it('passes injectedMetadata, rootDomElement, and a stopCoreSystem function to FatalErrorsService', () => {
    const rootDomElement = document.createElement('div');

    const coreSystem = createCoreSystem({
      rootDomElement,
    });

    expect(FatalErrorsServiceConstructor).toHaveBeenCalledTimes(1);

    expect(FatalErrorsServiceConstructor).toHaveBeenLastCalledWith(
      rootDomElement,
      expect.any(Function)
    );

    const [, stopCoreSystem] = FatalErrorsServiceConstructor.mock.calls[0];

    expect(coreSystem.stop).not.toHaveBeenCalled();
    stopCoreSystem();
    expect(coreSystem.stop).toHaveBeenCalled();
  });

  describe('logging system', () => {
    it('instantiate the logging system with the correct level', () => {
      const envMode: EnvironmentMode = {
        name: 'development',
        dev: true,
        prod: false,
      };
      const injectedMetadata = {
        ...defaultCoreSystemParams.injectedMetadata,
        env: { mode: envMode },
      } as any;

      createCoreSystem({
        injectedMetadata,
      });

      expect(LoggingSystemConstructor).toHaveBeenCalledTimes(1);
      expect(LoggingSystemConstructor).toHaveBeenCalledWith(
        defaultCoreSystemParams.injectedMetadata.logging
      );
    });

    it('retrieves the logger factory from the logging system', () => {
      createCoreSystem({});
      expect(MockLoggingSystem.asLoggerFactory).toHaveBeenCalledTimes(1);
    });
  });
});

describe('#setup()', () => {
  function setupCore(rootDomElement = defaultCoreSystemParams.rootDomElement) {
    const core = createCoreSystem({
      ...defaultCoreSystemParams,
      rootDomElement,
    });

    return core.setup();
  }

  it('calls analytics#setup()', async () => {
    await setupCore();
    expect(MockAnalyticsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls application#setup()', async () => {
    await setupCore();
    expect(MockApplicationService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls injectedMetadata#setup()', async () => {
    await setupCore();
    expect(MockInjectedMetadataService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls docLinks#setup()', async () => {
    await setupCore();
    expect(MockDocLinksService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls http#setup()', async () => {
    await setupCore();
    expect(MockHttpService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls uiSettings#setup()', async () => {
    await setupCore();
    expect(MockUiSettingsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls settings#setup()', async () => {
    await setupCore();
    expect(MockSettingsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls customBranding#setup()', async () => {
    await setupCore();
    expect(MockCustomBrandingService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls fatalErrors#setup()', async () => {
    await setupCore();
    expect(MockFatalErrorsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls notifications#setup()', async () => {
    await setupCore();
    expect(MockNotificationsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls plugin#setup()', async () => {
    await setupCore();
    expect(MockPluginsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls integrations#setup()', async () => {
    await setupCore();
    expect(MockIntegrationsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls coreApp#setup()', async () => {
    await setupCore();
    expect(MockCoreApp.setup).toHaveBeenCalledTimes(1);
  });

  it('calls theme#setup()', async () => {
    await setupCore();
    expect(MockThemeService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls chrome#setup()', async () => {
    await setupCore();
    expect(MockChromeService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls security#setup()', async () => {
    await setupCore();
    expect(MockSecurityService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls userProfile#setup()', async () => {
    await setupCore();
    expect(MockUserProfileService.setup).toHaveBeenCalledTimes(1);
  });
});

describe('#start()', () => {
  async function startCore(rootDomElement = defaultCoreSystemParams.rootDomElement) {
    const core = createCoreSystem({
      ...defaultCoreSystemParams,
      rootDomElement,
    });

    await core.setup();

    const services = await core.start();
    await services?.application.navigateToApp('home');
  }

  it('clears the children of the rootDomElement and appends container for rendering service with #kibana-body, notifications, overlays', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>foo bar</p>';
    await startCore(root);
    expect(root.innerHTML).toMatchInlineSnapshot(
      `"<div id=\\"kibana-body\\" data-test-subj=\\"kibanaChrome\\"></div><div></div><div></div>"`
    );
  });

  it('reports the deprecated event Loaded Kibana', async () => {
    await startCore();
    expect(analyticsServiceStartMock.reportEvent).toHaveBeenCalledTimes(2);
    expect(analyticsServiceStartMock.reportEvent).toHaveBeenNthCalledWith(1, 'Loaded Kibana', {
      kibana_version: '1.2.3',
      protocol: 'http:',
    });

    expect(window.performance.clearMarks).toHaveBeenCalledTimes(1);
  });

  it('reports the metric event kibana-loaded and clears marks', async () => {
    await startCore();
    expect(analyticsServiceStartMock.reportEvent).toHaveBeenCalledTimes(2);
    expect(analyticsServiceStartMock.reportEvent).toHaveBeenNthCalledWith(2, 'performance_metric', {
      eventName: KIBANA_LOADED_EVENT,
      meta: {
        kibana_version: '1.2.3',
        protocol: 'http:',
        deviceMemory: '5',
        hardwareConcurrency: '4',
      },
      key1: LOAD_START,
      key2: LOAD_BOOTSTRAP_START,
      key3: LOAD_CORE_CREATED,
      key4: LOAD_SETUP_DONE,
      key5: LOAD_START_DONE,
      value1: 111,
      value2: 222,
      value3: 333,
      value4: 444,
      value5: 555,
      duration: 666,
    });

    expect(window.performance.clearMarks).toHaveBeenCalledTimes(1);
  });

  it('reports the event kibana-loaded (with memory)', async () => {
    const performanceMemory = {
      usedJSHeapSize: 1,
      jsHeapSizeLimit: 3,
      totalJSHeapSize: 4,
    };
    fetchOptionalMemoryInfoMock.mockReturnValue(performanceMemory);

    await startCore();

    expect(analyticsServiceStartMock.reportEvent).toHaveBeenCalledTimes(2);
    expect(analyticsServiceStartMock.reportEvent).toHaveBeenNthCalledWith(2, 'performance_metric', {
      eventName: KIBANA_LOADED_EVENT,
      meta: {
        kibana_version: '1.2.3',
        protocol: 'http:',
        deviceMemory: '5',
        hardwareConcurrency: '4',
        ...performanceMemory,
      },
      key1: LOAD_START,
      key2: LOAD_BOOTSTRAP_START,
      key3: LOAD_CORE_CREATED,
      key4: LOAD_SETUP_DONE,
      key5: LOAD_START_DONE,
      value1: 111,
      value2: 222,
      value3: 333,
      value4: 444,
      value5: 555,
      duration: 666,
    });
  });

  it('calls analytics#start()', async () => {
    await startCore();
    expect(MockAnalyticsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls application#start()', async () => {
    await startCore();
    expect(MockApplicationService.start).toHaveBeenCalledTimes(1);
  });

  it('calls docLinks#start()', async () => {
    await startCore();
    expect(MockDocLinksService.start).toHaveBeenCalledTimes(1);
  });

  it('calls uiSettings#start()', async () => {
    await startCore();
    expect(MockUiSettingsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls settings#start()', async () => {
    await startCore();
    expect(MockSettingsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls customBranding#start()', async () => {
    await startCore();
    expect(MockCustomBrandingService.start).toHaveBeenCalledTimes(1);
  });

  it('calls i18n#start()', async () => {
    await startCore();
    expect(MockI18nService.start).toHaveBeenCalledTimes(1);
  });

  it('calls injectedMetadata#start()', async () => {
    await startCore();
    expect(MockInjectedMetadataService.start).toHaveBeenCalledTimes(1);
  });

  it('calls notifications#start() with a dom element', async () => {
    await startCore();
    expect(MockNotificationsService.start).toHaveBeenCalledTimes(1);
    expect(MockNotificationsService.start).toHaveBeenCalledWith({
      i18n: expect.any(Object),
      overlays: expect.any(Object),
      theme: expect.any(Object),
      userProfile: expect.any(Object),
      targetDomElement: expect.any(HTMLElement),
      analytics: expect.any(Object),
    });
  });

  it('calls plugins#start()', async () => {
    await startCore();
    expect(MockPluginsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls overlays#start()', async () => {
    await startCore();
    expect(MockOverlayService.start).toHaveBeenCalledTimes(1);
  });

  it('calls rendering#start()', async () => {
    await startCore();
    expect(MockRenderingService.start).toHaveBeenCalledTimes(1);
    expect(MockRenderingService.start).toHaveBeenCalledWith({
      analytics: expect.any(Object),
      application: expect.any(Object),
      chrome: expect.any(Object),
      overlays: expect.any(Object),
      i18n: expect.any(Object),
      theme: expect.any(Object),
      userProfile: expect.any(Object),
      targetDomElement: expect.any(HTMLElement),
    });
  });

  it('calls integrations#start()', async () => {
    await startCore();
    expect(MockIntegrationsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls coreApp#start()', async () => {
    await startCore();
    expect(MockCoreApp.start).toHaveBeenCalledTimes(1);
  });

  it('calls theme#start()', async () => {
    await startCore();
    expect(MockThemeService.start).toHaveBeenCalledTimes(1);
  });

  it('calls security#start()', async () => {
    await startCore();
    expect(MockSecurityService.start).toHaveBeenCalledTimes(1);
  });

  it('calls userProfile#start()', async () => {
    await startCore();
    expect(MockUserProfileService.start).toHaveBeenCalledTimes(1);
  });
});

describe('#stop()', () => {
  it('calls notifications.stop()', () => {
    const coreSystem = createCoreSystem();

    expect(MockNotificationsService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockNotificationsService.stop).toHaveBeenCalled();
  });

  it('calls http.stop()', () => {
    const coreSystem = createCoreSystem();
    expect(MockHttpService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockHttpService.stop).toHaveBeenCalled();
  });

  it('calls chrome.stop()', () => {
    const coreSystem = createCoreSystem();

    expect(MockChromeService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockChromeService.stop).toHaveBeenCalled();
  });

  it('calls uiSettings.stop()', () => {
    const coreSystem = createCoreSystem();

    expect(MockUiSettingsService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockUiSettingsService.stop).toHaveBeenCalled();
  });

  it('calls i18n.stop()', () => {
    const coreSystem = createCoreSystem();

    expect(MockI18nService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockI18nService.stop).toHaveBeenCalled();
  });

  it('calls integrations.stop()', () => {
    const coreSystem = createCoreSystem();

    expect(MockIntegrationsService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockIntegrationsService.stop).toHaveBeenCalled();
  });

  it('calls coreApp.stop()', () => {
    const coreSystem = createCoreSystem();

    expect(MockCoreApp.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockCoreApp.stop).toHaveBeenCalled();
  });

  it('calls theme.stop()', () => {
    const coreSystem = createCoreSystem();

    expect(MockThemeService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockThemeService.stop).toHaveBeenCalled();
  });

  it('clears the rootDomElement', async () => {
    const rootDomElement = document.createElement('div');
    const coreSystem = createCoreSystem({
      rootDomElement,
    });

    await coreSystem.setup();
    await coreSystem.start();
    expect(rootDomElement.innerHTML).not.toBe('');
    await coreSystem.stop();
    expect(rootDomElement.innerHTML).toBe('');
  });
});

describe('RenderingService targetDomElement', () => {
  it('only mounts the element when start, after setting up the renderingService', async () => {
    const rootDomElement = document.createElement('div');
    const core = createCoreSystem({
      rootDomElement,
    });

    let targetDomElementParentInStart: HTMLElement | null;
    MockRenderingService.start.mockImplementation(({ targetDomElement }) => {
      targetDomElementParentInStart = targetDomElement.parentElement;
    });

    // Starting the core system should pass the targetDomElement as a child of the rootDomElement
    await core.setup();
    await core.start();
    expect(targetDomElementParentInStart!).toBe(rootDomElement);
  });
});

describe('Notifications targetDomElement', () => {
  it('only mounts the element when started, after setting up the notificationsService', async () => {
    const rootDomElement = document.createElement('div');
    const core = createCoreSystem({
      rootDomElement,
    });

    let targetDomElementInStart: HTMLElement | null;
    MockNotificationsService.start.mockImplementation(({ targetDomElement }): any => {
      targetDomElementInStart = targetDomElement;
    });

    // Starting the core system should pass the targetDomElement as a child of the rootDomElement
    await core.setup();
    await core.start();
    expect(targetDomElementInStart!.parentElement).toBe(rootDomElement);
  });
});
