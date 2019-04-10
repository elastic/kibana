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

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

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
      targetDomElement: expect.any(HTMLElement),
      requireLegacyFiles,
      useLegacyTestHarness,
    });
  });

  it('passes a dom element to NotificationsService', () => {
    createCoreSystem();

    expect(NotificationServiceConstructor).toHaveBeenCalledTimes(1);
    expect(NotificationServiceConstructor).toHaveBeenCalledWith({
      targetDomElement$: expect.any(Observable),
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

    expect(FatalErrorsServiceConstructor).toHaveBeenLastCalledWith({
      rootDomElement,
      injectedMetadata: MockInjectedMetadataService,
      stopCoreSystem: expect.any(Function),
    });

    const [{ stopCoreSystem }] = FatalErrorsServiceConstructor.mock.calls[0];

    expect(coreSystem.stop).not.toHaveBeenCalled();
    stopCoreSystem();
    expect(coreSystem.stop).toHaveBeenCalled();
  });
});

describe('#stop', () => {
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
    expect(rootDomElement.innerHTML).not.toBe('');
    await coreSystem.stop();
    expect(rootDomElement.innerHTML).toBe('');
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

  it('clears the children of the rootDomElement and appends container for legacyPlatform and notifications', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>foo bar</p>';
    await setupCore(root);
    expect(root.innerHTML).toBe('<div></div><div></div><div></div>');
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

  it('calls overlays#setup()', () => {
    setupCore();
    expect(MockOverlayService.setup).toHaveBeenCalledTimes(1);
  });

  it('calls plugin#setup()', async () => {
    await setupCore();
    expect(MockPluginsService.setup).toHaveBeenCalledTimes(1);
  });
});

describe('LegacyPlatform targetDomElement', () => {
  it('only mounts the element when set up, before setting up the legacyPlatformService', async () => {
    const rootDomElement = document.createElement('div');
    const core = createCoreSystem({
      rootDomElement,
    });

    let targetDomElementParentInSetup: HTMLElement;
    MockLegacyPlatformService.setup.mockImplementation(() => {
      targetDomElementParentInSetup = targetDomElement.parentElement;
    });

    // targetDomElement should not have a parent element when the LegacyPlatformService is constructed
    const [[{ targetDomElement }]] = LegacyPlatformServiceConstructor.mock.calls;
    expect(targetDomElement).toHaveProperty('parentElement', null);

    // setting up the core system should mount the targetDomElement as a child of the rootDomElement
    await core.setup();
    expect(targetDomElementParentInSetup!).toBe(rootDomElement);
  });
});

describe('Notifications targetDomElement', () => {
  it('only mounts the element when set up, before setting up the notificationsService', async () => {
    const rootDomElement = document.createElement('div');
    const core = createCoreSystem({
      rootDomElement,
    });

    const [[{ targetDomElement$ }]] = NotificationServiceConstructor.mock.calls;

    let targetDomElementParentInSetup: HTMLElement | null;
    MockNotificationsService.setup.mockImplementation(
      (): any => {
        (targetDomElement$ as Observable<HTMLElement>).pipe(take(1)).subscribe({
          next: targetDomElement => {
            // The targetDomElement should already be a child once it's received by the NotificationsService
            expect(targetDomElement.parentElement).not.toBeNull();
            targetDomElementParentInSetup = targetDomElement.parentElement;
          },
        });
      }
    );

    // setting up the core system should mount the targetDomElement as a child of the rootDomElement
    await core.setup();
    expect(targetDomElementParentInSetup!).toBe(rootDomElement);
  });
});
