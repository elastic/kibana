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

import { BasePathService } from './base_path';
import { ChromeService } from './chrome';
import { FatalErrorsService } from './fatal_errors';
import { HttpService } from './http';
import { I18nService } from './i18n';
import { InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformService } from './legacy';
import { NotificationsService } from './notifications';
import { UiSettingsService } from './ui_settings';

const MockLegacyPlatformService = jest.fn<LegacyPlatformService, any>(
  function _MockLegacyPlatformService(this: any) {
    this.start = jest.fn();
    this.stop = jest.fn();
    return this;
  }
);

jest.mock('./legacy', () => ({
  LegacyPlatformService: MockLegacyPlatformService,
}));

const mockInjectedMetadataStart = {};
const MockInjectedMetadataService = jest.fn<InjectedMetadataService, any>(
  function _MockInjectedMetadataService(this: any) {
    this.start = jest.fn().mockReturnValue(mockInjectedMetadataStart);
    return this;
  }
);
jest.mock('./injected_metadata', () => ({
  InjectedMetadataService: MockInjectedMetadataService,
}));

const mockFatalErrorsStart = {};
const MockFatalErrorsService = jest.fn<FatalErrorsService, any>(function _MockFatalErrorsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockFatalErrorsStart);
  this.add = jest.fn();
  return this;
});
jest.mock('./fatal_errors', () => ({
  FatalErrorsService: MockFatalErrorsService,
}));

const mockI18nStart = {};
const MockI18nService = jest.fn<I18nService, any>(function _MockI18nService(this: any) {
  this.start = jest.fn().mockReturnValue(mockI18nStart);
  this.stop = jest.fn();
  return this;
});
jest.mock('./i18n', () => ({
  I18nService: MockI18nService,
}));

const mockNotificationStart = {};
const MockNotificationsService = jest.fn<NotificationsService, any>(
  function _MockNotificationsService(this: any) {
    this.start = jest.fn().mockReturnValue(mockNotificationStart);
    this.add = jest.fn();
    this.stop = jest.fn();
    return this;
  }
);

jest.mock('./notifications', () => ({
  NotificationsService: MockNotificationsService,
}));

const mockHttp = {};
const MockHttpService = jest.fn<HttpService, any>(function _MockNotificationsService(this: any) {
  this.start = jest.fn().mockReturnValue(mockHttp);
  this.stop = jest.fn();
  return this;
});
jest.mock('./http', () => ({
  HttpService: MockHttpService,
}));

const mockBasePathStart = {};
const MockBasePathService = jest.fn<BasePathService, any>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockBasePathStart);
  return this;
});
jest.mock('./base_path', () => ({
  BasePathService: MockBasePathService,
}));

const mockUiSettings = {};
const MockUiSettingsService = jest.fn<UiSettingsService, any>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockUiSettings);
  this.stop = jest.fn();
  return this;
});
jest.mock('./ui_settings', () => ({
  UiSettingsService: MockUiSettingsService,
}));

const mockChromeStart = {};
const MockChromeService = jest.fn<ChromeService, any>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockChromeStart);
  this.stop = jest.fn();
  return this;
});
jest.mock('./chrome', () => ({
  ChromeService: MockChromeService,
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

describe('constructor', () => {
  it('creates instances of services', () => {
    // tslint:disable no-unused-expression
    new CoreSystem({
      ...defaultCoreSystemParams,
    });

    expect(MockInjectedMetadataService).toHaveBeenCalledTimes(1);
    expect(MockLegacyPlatformService).toHaveBeenCalledTimes(1);
    expect(MockI18nService).toHaveBeenCalledTimes(1);
    expect(MockFatalErrorsService).toHaveBeenCalledTimes(1);
    expect(MockNotificationsService).toHaveBeenCalledTimes(1);
    expect(MockHttpService).toHaveBeenCalledTimes(1);
    expect(MockBasePathService).toHaveBeenCalledTimes(1);
    expect(MockUiSettingsService).toHaveBeenCalledTimes(1);
    expect(MockChromeService).toHaveBeenCalledTimes(1);
  });

  it('passes injectedMetadata param to InjectedMetadataService', () => {
    const injectedMetadata = { injectedMetadata: true } as any;

    // tslint:disable no-unused-expression
    new CoreSystem({
      ...defaultCoreSystemParams,
      injectedMetadata,
    });

    expect(MockInjectedMetadataService).toHaveBeenCalledTimes(1);
    expect(MockInjectedMetadataService).toHaveBeenCalledWith({
      injectedMetadata,
    });
  });

  it('passes requireLegacyFiles, useLegacyTestHarness, and a dom element to LegacyPlatformService', () => {
    const requireLegacyFiles = { requireLegacyFiles: true } as any;
    const useLegacyTestHarness = { useLegacyTestHarness: true } as any;

    // tslint:disable no-unused-expression
    new CoreSystem({
      ...defaultCoreSystemParams,
      requireLegacyFiles,
      useLegacyTestHarness,
    });

    expect(MockLegacyPlatformService).toHaveBeenCalledTimes(1);
    expect(MockLegacyPlatformService).toHaveBeenCalledWith({
      targetDomElement: expect.any(HTMLElement),
      requireLegacyFiles,
      useLegacyTestHarness,
    });
  });

  it('passes a dom element to NotificationsService', () => {
    // tslint:disable no-unused-expression
    new CoreSystem({
      ...defaultCoreSystemParams,
    });

    expect(MockNotificationsService).toHaveBeenCalledTimes(1);
    expect(MockNotificationsService).toHaveBeenCalledWith({
      targetDomElement: expect.any(HTMLElement),
    });
  });

  it('passes browserSupportsCsp to ChromeService', () => {
    new CoreSystem({
      ...defaultCoreSystemParams,
    });

    expect(MockChromeService).toHaveBeenCalledTimes(1);
    expect(MockChromeService).toHaveBeenCalledWith({
      browserSupportsCsp: expect.any(Boolean),
    });
  });

  it('passes injectedMetadata, rootDomElement, and a stopCoreSystem function to FatalErrorsService', () => {
    const rootDomElement = document.createElement('div');
    const injectedMetadata = { injectedMetadata: true } as any;

    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
      rootDomElement,
      injectedMetadata,
    });

    expect(MockFatalErrorsService).toHaveBeenCalledTimes(1);
    expect(MockFatalErrorsService).toHaveBeenLastCalledWith({
      rootDomElement,
      injectedMetadata: expect.any(MockInjectedMetadataService),
      stopCoreSystem: expect.any(Function),
    });

    const [{ stopCoreSystem }] = MockFatalErrorsService.mock.calls[0];

    expect(coreSystem.stop).not.toHaveBeenCalled();
    stopCoreSystem();
    expect(coreSystem.stop).toHaveBeenCalled();
  });
});

describe('#stop', () => {
  it('calls legacyPlatform.stop()', () => {
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    const [legacyPlatformService] = MockLegacyPlatformService.mock.instances;
    expect(legacyPlatformService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(legacyPlatformService.stop).toHaveBeenCalled();
  });

  it('calls notifications.stop()', () => {
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    const [notificationsService] = MockNotificationsService.mock.instances;
    expect(notificationsService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(notificationsService.stop).toHaveBeenCalled();
  });

  it('calls http.stop()', () => {
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    const [httpService] = MockHttpService.mock.instances;
    expect(httpService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(httpService.stop).toHaveBeenCalled();
  });

  it('calls chrome.stop()', () => {
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    const [chromeService] = MockChromeService.mock.instances;
    expect(chromeService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(chromeService.stop).toHaveBeenCalled();
  });

  it('calls uiSettings.stop()', () => {
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    const [uiSettings] = MockUiSettingsService.mock.instances;
    expect(uiSettings.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(uiSettings.stop).toHaveBeenCalled();
  });

  it('calls i18n.stop()', () => {
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    const [i18n] = MockI18nService.mock.instances;
    expect(i18n.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(i18n.stop).toHaveBeenCalled();
  });

  it('clears the rootDomElement', () => {
    const rootDomElement = document.createElement('div');
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
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
    const core = new CoreSystem({
      ...defaultCoreSystemParams,
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
    const [mockInstance] = MockInjectedMetadataService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith();
  });

  it('calls http#start()', () => {
    startCore();
    const [mockInstance] = MockHttpService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({
      fatalErrors: mockFatalErrorsStart,
    });
  });

  it('calls basePath#start()', () => {
    startCore();
    const [mockInstance] = MockBasePathService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({
      injectedMetadata: mockInjectedMetadataStart,
    });
  });

  it('calls uiSettings#start()', () => {
    startCore();
    const [mockInstance] = MockUiSettingsService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({
      notifications: mockNotificationStart,
      http: mockHttp,
      injectedMetadata: mockInjectedMetadataStart,
      basePath: mockBasePathStart,
    });
  });

  it('calls i18n#start()', () => {
    startCore();
    const [mockInstance] = MockI18nService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith();
  });

  it('calls fatalErrors#start()', () => {
    startCore();
    const [mockInstance] = MockFatalErrorsService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({ i18n: mockI18nStart });
  });

  it('calls notifications#start()', () => {
    startCore();
    const [mockInstance] = MockNotificationsService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({ i18n: mockI18nStart });
  });

  it('calls chrome#start()', () => {
    startCore();
    const [mockInstance] = MockChromeService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({
      notifications: mockNotificationStart,
      injectedMetadata: mockInjectedMetadataStart,
    });
  });

  it('returns start contract', () => {
    expect(startCore()).toEqual({ fatalErrors: mockFatalErrorsStart });
  });
});

describe('LegacyPlatform targetDomElement', () => {
  it('only mounts the element when started, before starting the legacyPlatformService', () => {
    const rootDomElement = document.createElement('div');
    const core = new CoreSystem({
      ...defaultCoreSystemParams,
      rootDomElement,
    });

    const [legacyPlatform] = MockLegacyPlatformService.mock.instances;

    let targetDomElementParentInStart: HTMLElement;
    (legacyPlatform as any).start.mockImplementation(() => {
      targetDomElementParentInStart = targetDomElement.parentElement;
    });

    // targetDomElement should not have a parent element when the LegacyPlatformService is constructed
    const [[{ targetDomElement }]] = MockLegacyPlatformService.mock.calls;
    expect(targetDomElement).toHaveProperty('parentElement', null);

    // starting the core system should mount the targetDomElement as a child of the rootDomElement
    core.start();
    expect(targetDomElementParentInStart!).toBe(rootDomElement);
  });
});

describe('Notifications targetDomElement', () => {
  it('only mounts the element when started, before starting the notificationsService', () => {
    const rootDomElement = document.createElement('div');
    const core = new CoreSystem({
      ...defaultCoreSystemParams,
      rootDomElement,
    });

    const [notifications] = MockNotificationsService.mock.instances;

    let targetDomElementParentInStart: HTMLElement;
    (notifications as any).start.mockImplementation(() => {
      targetDomElementParentInStart = targetDomElement.parentElement;
    });

    // targetDomElement should not have a parent element when the LegacyPlatformService is constructed
    const [[{ targetDomElement }]] = MockNotificationsService.mock.calls;
    expect(targetDomElement).toHaveProperty('parentElement', null);

    // starting the core system should mount the targetDomElement as a child of the rootDomElement
    core.start();
    expect(targetDomElementParentInStart!).toBe(rootDomElement);
  });
});
