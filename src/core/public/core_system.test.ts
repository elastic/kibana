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

import { basePathServiceMock } from './base_path/base_path_service.mock';
import { chromeServiceMock } from './chrome/chrome_service.mock';
import { fatalErrorsServiceMock } from './fatal_errors/fatal_errors_service.mock';
import { httpServiceMock } from './http/http_service.mock';
import { i18nServiceMock } from './i18n/i18n_service.mock';
import { injectedMetadataServiceMock } from './injected_metadata/injected_metadata_service.mock';
import { legacyPlatformServiceMock } from './legacy/legacy_service.mock';
import { notificationServiceMock } from './notifications/notifications_service.mock';
import { uiSettingsServiceMock } from './ui_settings/ui_settings_service.mock';

const MockLegacyPlatformService = legacyPlatformServiceMock.create();
const LegacyPlatformServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockLegacyPlatformService);
jest.mock('./legacy', () => ({
  LegacyPlatformService: LegacyPlatformServiceConstructor,
}));

const MockInjectedMetadataService = injectedMetadataServiceMock.create();
const InjectedMetadataServiceConstructor = jest
  .fn()
  .mockImplementation(() => MockInjectedMetadataService);
jest.mock('./injected_metadata', () => ({
  InjectedMetadataService: InjectedMetadataServiceConstructor,
}));

const MockFatalErrorsService = fatalErrorsServiceMock.create();
const FatalErrorsServiceConstructor = jest.fn().mockImplementation(() => MockFatalErrorsService);
jest.mock('./fatal_errors', () => ({
  FatalErrorsService: FatalErrorsServiceConstructor,
}));

const MockI18nService = i18nServiceMock.create();
const I18nServiceConstructor = jest.fn().mockImplementation(() => MockI18nService);
jest.mock('./i18n', () => ({
  I18nService: I18nServiceConstructor,
}));

const MockNotificationsService = notificationServiceMock.create();
const NotificationServiceConstructor = jest.fn().mockImplementation(() => MockNotificationsService);
jest.mock('./notifications', () => ({
  NotificationsService: NotificationServiceConstructor,
}));

const MockHttpService = httpServiceMock.create();
const HttpServiceConstructor = jest.fn().mockImplementation(() => MockHttpService);
jest.mock('./http', () => ({
  HttpService: HttpServiceConstructor,
}));

const MockBasePathService = basePathServiceMock.create();
const BasePathServiceConstructor = jest.fn().mockImplementation(() => MockBasePathService);
jest.mock('./base_path', () => ({
  BasePathService: BasePathServiceConstructor,
}));

const MockUiSettingsService = uiSettingsServiceMock.create();
const UiSettingsServiceConstructor = jest.fn().mockImplementation(() => MockUiSettingsService);
jest.mock('./ui_settings', () => ({
  UiSettingsService: UiSettingsServiceConstructor,
}));

const MockChromeService = chromeServiceMock.create();
const ChromeServiceConstructor = jest.fn().mockImplementation(() => MockChromeService);
jest.mock('./chrome', () => ({
  ChromeService: ChromeServiceConstructor,
}));

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
      targetDomElement: expect.any(HTMLElement),
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

  it('clears the rootDomElement', () => {
    const rootDomElement = document.createElement('div');
    const coreSystem = createCoreSystem({
      rootDomElement,
    });

    coreSystem.start();
    expect(rootDomElement.innerHTML).not.toBe('');
    coreSystem.stop();
    expect(rootDomElement.innerHTML).toBe('');
  });
});

describe('#start()', () => {
  function startCore(rootDomElement = defaultCoreSystemParams.rootDomElement) {
    const core = createCoreSystem({
      rootDomElement,
    });

    return core.start();
  }

  it('clears the children of the rootDomElement and appends container for legacyPlatform and notifications', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>foo bar</p>';
    startCore(root);
    expect(root.innerHTML).toBe('<div></div><div></div>');
  });

  it('calls injectedMetadata#start()', () => {
    startCore();

    expect(MockInjectedMetadataService.start).toHaveBeenCalledTimes(1);
  });

  it('calls http#start()', () => {
    startCore();
    expect(MockHttpService.start).toHaveBeenCalledTimes(1);
  });

  it('calls basePath#start()', () => {
    startCore();
    expect(MockBasePathService.start).toHaveBeenCalledTimes(1);
  });

  it('calls uiSettings#start()', () => {
    startCore();
    expect(MockUiSettingsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls i18n#start()', () => {
    startCore();
    expect(MockI18nService.start).toHaveBeenCalledTimes(1);
  });

  it('calls fatalErrors#start()', () => {
    startCore();
    expect(MockFatalErrorsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls notifications#start()', () => {
    startCore();
    expect(MockNotificationsService.start).toHaveBeenCalledTimes(1);
  });

  it('calls chrome#start()', () => {
    startCore();
    expect(MockChromeService.start).toHaveBeenCalledTimes(1);
  });
});

describe('LegacyPlatform targetDomElement', () => {
  it('only mounts the element when started, before starting the legacyPlatformService', () => {
    const rootDomElement = document.createElement('div');
    const core = createCoreSystem({
      rootDomElement,
    });

    let targetDomElementParentInStart: HTMLElement;
    MockLegacyPlatformService.start.mockImplementation(() => {
      targetDomElementParentInStart = targetDomElement.parentElement;
    });

    // targetDomElement should not have a parent element when the LegacyPlatformService is constructed
    const [[{ targetDomElement }]] = LegacyPlatformServiceConstructor.mock.calls;
    expect(targetDomElement).toHaveProperty('parentElement', null);

    // starting the core system should mount the targetDomElement as a child of the rootDomElement
    core.start();
    expect(targetDomElementParentInStart!).toBe(rootDomElement);
  });
});

describe('Notifications targetDomElement', () => {
  it('only mounts the element when started, before starting the notificationsService', () => {
    const rootDomElement = document.createElement('div');
    const core = createCoreSystem({
      rootDomElement,
    });

    let targetDomElementParentInStart: HTMLElement;

    MockNotificationsService.start.mockImplementation(
      (): any => {
        targetDomElementParentInStart = targetDomElement.parentElement;
      }
    );

    // targetDomElement should not have a parent element when the LegacyPlatformService is constructed
    const [[{ targetDomElement }]] = NotificationServiceConstructor.mock.calls;
    expect(targetDomElement).toHaveProperty('parentElement', null);

    // starting the core system should mount the targetDomElement as a child of the rootDomElement
    core.start();
    expect(targetDomElementParentInStart!).toBe(rootDomElement);
  });
});
