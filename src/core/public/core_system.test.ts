/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
} from './core_system.test.mocks';

import { CoreSystem } from './core_system';

jest.spyOn(CoreSystem.prototype, 'stop');

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
      },
    },
    version: 'version',
  } as any,
};

beforeEach(() => {
  jest.clearAllMocks();
  MockPluginsService.getOpaqueIds.mockReturnValue(new Map());
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
    expect(ChromeServiceConstructor).toHaveBeenCalledTimes(1);
    expect(OverlayServiceConstructor).toHaveBeenCalledTimes(1);
    expect(RenderingServiceConstructor).toHaveBeenCalledTimes(1);
    expect(IntegrationsServiceConstructor).toHaveBeenCalledTimes(1);
    expect(CoreAppConstructor).toHaveBeenCalledTimes(1);
    expect(ThemeServiceConstructor).toHaveBeenCalledTimes(1);
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
});

describe('#setup()', () => {
  function setupCore(rootDomElement = defaultCoreSystemParams.rootDomElement) {
    const core = createCoreSystem({
      ...defaultCoreSystemParams,
      rootDomElement,
    });

    return core.setup();
  }

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
});

describe('#start()', () => {
  async function startCore(rootDomElement = defaultCoreSystemParams.rootDomElement) {
    const core = createCoreSystem({
      ...defaultCoreSystemParams,
      rootDomElement,
    });

    await core.setup();
    await core.start();
  }

  it('clears the children of the rootDomElement and appends container for rendering service with #kibana-body, notifications, overlays', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>foo bar</p>';
    await startCore(root);
    expect(root.innerHTML).toMatchInlineSnapshot(
      `"<div id=\\"kibana-body\\" data-test-subj=\\"kibanaChrome\\"></div><div></div><div></div>"`
    );
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
      targetDomElement: expect.any(HTMLElement),
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
      application: expect.any(Object),
      chrome: expect.any(Object),
      overlays: expect.any(Object),
      i18n: expect.any(Object),
      theme: expect.any(Object),
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
