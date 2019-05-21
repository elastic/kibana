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

import {
  BasePathServiceConstructor,
  ChromeServiceConstructor,
  FatalErrorsServiceConstructor,
  HttpServiceConstructor,
  I18nServiceConstructor,
  InjectedMetadataServiceConstructor,
  LegacyPlatformServiceConstructor,
  MockBasePathService,
  MockChromeService,
  MockFatalErrorsService,
  MockHttpService,
  MockI18nService,
  MockInjectedMetadataService,
  MockLegacyPlatformService,
  MockNotificationsService,
  MockOverlayService,
  MockPluginsService,
  MockUiSettingsService,
  NotificationServiceConstructor,
  OverlayServiceConstructor,
  UiSettingsServiceConstructor,
  MockApplicationService,
} from './core_system.test.mocks';

import { CoreSystem } from './core_system';

jest.spyOn(CoreSystem.prototype, 'stop');

const defaultCoreSystemParams = {
  rootDomElement: document.createElement('div'),
  browserSupportsCsp: true,
  injectedMetadata: {
    csp: {
      warnLegacyBrowsers: true,
    },
  } as any,
  requireLegacyFiles: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
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
    expect(LegacyPlatformServiceConstructor).toHaveBeenCalledTimes(1);
    expect(I18nServiceConstructor).toHaveBeenCalledTimes(1);
    expect(FatalErrorsServiceConstructor).toHaveBeenCalledTimes(1);
    expect(NotificationServiceConstructor).toHaveBeenCalledTimes(1);
    expect(HttpServiceConstructor).toHaveBeenCalledTimes(1);
    expect(BasePathServiceConstructor).toHaveBeenCalledTimes(1);
    expect(UiSettingsServiceConstructor).toHaveBeenCalledTimes(1);
    expect(ChromeServiceConstructor).toHaveBeenCalledTimes(1);
    expect(OverlayServiceConstructor).toHaveBeenCalledTimes(1);
  });

  it('passes injectedMetadata param to InjectedMetadataService', () => {
    const injectedMetadata = { injectedMetadata: true } as any;

    createCoreSystem({
      injectedMetadata,
    });

    expect(InjectedMetadataServiceConstructor).toHaveBeenCalledTimes(1);
    expect(InjectedMetadataServiceConstructor).toHaveBeenCalledWith({
      injectedMetadata,
    });
  });

  it('passes requireLegacyFiles, useLegacyTestHarness, and a dom element to LegacyPlatformService', () => {
    const requireLegacyFiles = { requireLegacyFiles: true };
    const useLegacyTestHarness = { useLegacyTestHarness: true };

    createCoreSystem({
      requireLegacyFiles,
      useLegacyTestHarness,
    });

    expect(LegacyPlatformServiceConstructor).toHaveBeenCalledTimes(1);
    expect(LegacyPlatformServiceConstructor).toHaveBeenCalledWith({
      requireLegacyFiles,
      useLegacyTestHarness,
    });
  });

  it('passes browserSupportsCsp to ChromeService', () => {
    createCoreSystem();

    expect(ChromeServiceConstructor).toHaveBeenCalledTimes(1);
    expect(ChromeServiceConstructor).toHaveBeenCalledWith({
      browserSupportsCsp: expect.any(Boolean),
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

  it('calls http#setup()', async () => {
    await setupCore();
    expect(MockHttpService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls basePath#setup()', async () => {
    await setupCore();
    expect(MockBasePathService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls uiSettings#setup()', async () => {
    await setupCore();
    expect(MockUiSettingsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls i18n#setup()', async () => {
    await setupCore();
    expect(MockI18nService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls fatalErrors#setup()', async () => {
    await setupCore();
    expect(MockFatalErrorsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls notifications#setup()', async () => {
    await setupCore();
    expect(MockNotificationsService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls chrome#setup()', async () => {
    await setupCore();
    expect(MockChromeService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls plugin#setup()', async () => {
    await setupCore();
    expect(MockPluginsService.setup).toHaveBeenCalledTimes(1);
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

  it('clears the children of the rootDomElement and appends container for legacyPlatform and notifications', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>foo bar</p>';
    await startCore(root);
    expect(root.innerHTML).toBe('<div></div><div></div><div></div>');
  });

  it('calls application#start()', async () => {
    await startCore();
    expect(MockApplicationService.start).toHaveBeenCalledTimes(1);
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
      targetDomElement: expect.any(HTMLElement),
    });
  });

  it('calls plugins#start()', async () => {
    await startCore();
    expect(MockPluginsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls legacyPlatform#start()', async () => {
    await startCore();
    expect(MockLegacyPlatformService.start).toHaveBeenCalledTimes(1);
  });

  it('calls overlays#start()', async () => {
    await startCore();
    expect(MockOverlayService.start).toHaveBeenCalledTimes(1);
  });
});

describe('#stop()', () => {
  it('calls legacyPlatform.stop()', () => {
    const coreSystem = createCoreSystem();

    expect(MockLegacyPlatformService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(MockLegacyPlatformService.stop).toHaveBeenCalled();
  });

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

describe('LegacyPlatform targetDomElement', () => {
  it('only mounts the element when start, after setting up the legacyPlatformService', async () => {
    const rootDomElement = document.createElement('div');
    const core = createCoreSystem({
      rootDomElement,
    });

    let targetDomElementParentInStart: HTMLElement | null;
    MockLegacyPlatformService.start.mockImplementation(async ({ targetDomElement }) => {
      targetDomElementParentInStart = targetDomElement.parentElement;
    });

    // setting up the core system should mount the targetDomElement as a child of the rootDomElement
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

    let targetDomElementParentInStart: HTMLElement | null;
    MockNotificationsService.start.mockImplementation(
      ({ targetDomElement }): any => {
        expect(targetDomElement.parentElement).not.toBeNull();
        targetDomElementParentInStart = targetDomElement.parentElement;
      }
    );

    // setting up and starting the core system should mount the targetDomElement as a child of the rootDomElement
    await core.setup();
    await core.start();
    expect(targetDomElementParentInStart!).toBe(rootDomElement);
  });
});
