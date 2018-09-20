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
import { InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformService } from './legacy_platform';
import { LoadingCountService } from './loading_count';
import { NotificationsService } from './notifications';
import { UiSettingsService } from './ui_settings';

const MockLegacyPlatformService = jest.fn<LegacyPlatformService>(
  function _MockLegacyPlatformService(this: any) {
    this.start = jest.fn();
    this.stop = jest.fn();
  }
);
jest.mock('./legacy_platform', () => ({
  LegacyPlatformService: MockLegacyPlatformService,
}));

const mockInjectedMetadataStartContract = {};
const MockInjectedMetadataService = jest.fn<InjectedMetadataService>(
  function _MockInjectedMetadataService(this: any) {
    this.start = jest.fn().mockReturnValue(mockInjectedMetadataStartContract);
  }
);
jest.mock('./injected_metadata', () => ({
  InjectedMetadataService: MockInjectedMetadataService,
}));

const mockFatalErrorsStartContract = {};
const MockFatalErrorsService = jest.fn<FatalErrorsService>(function _MockFatalErrorsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockFatalErrorsStartContract);
  this.add = jest.fn();
});
jest.mock('./fatal_errors', () => ({
  FatalErrorsService: MockFatalErrorsService,
}));

const mockNotificationStartContract = {};
const MockNotificationsService = jest.fn<NotificationsService>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockNotificationStartContract);
  this.add = jest.fn();
  this.stop = jest.fn();
});
jest.mock('./notifications', () => ({
  NotificationsService: MockNotificationsService,
}));

const mockLoadingCountContract = {};
const MockLoadingCountService = jest.fn<LoadingCountService>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockLoadingCountContract);
  this.stop = jest.fn();
});
jest.mock('./loading_count', () => ({
  LoadingCountService: MockLoadingCountService,
}));

const mockBasePathStartContract = {};
const MockBasePathService = jest.fn<BasePathService>(function _MockNotificationsService(this: any) {
  this.start = jest.fn().mockReturnValue(mockBasePathStartContract);
});
jest.mock('./base_path', () => ({
  BasePathService: MockBasePathService,
}));

const mockUiSettingsContract = {};
const MockUiSettingsService = jest.fn<UiSettingsService>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockUiSettingsContract);
  this.stop = jest.fn();
});
jest.mock('./ui_settings', () => ({
  UiSettingsService: MockUiSettingsService,
}));

const mockChromeStartContract = {};
const MockChromeService = jest.fn<ChromeService>(function _MockNotificationsService(this: any) {
  this.start = jest.fn().mockReturnValue(mockChromeStartContract);
  this.stop = jest.fn();
});
jest.mock('./chrome', () => ({
  ChromeService: MockChromeService,
}));

import { CoreSystem } from './core_system';
jest.spyOn(CoreSystem.prototype, 'stop');

const defaultCoreSystemParams = {
  rootDomElement: document.createElement('div'),
  injectedMetadata: {} as any,
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
    expect(MockFatalErrorsService).toHaveBeenCalledTimes(1);
    expect(MockNotificationsService).toHaveBeenCalledTimes(1);
    expect(MockLoadingCountService).toHaveBeenCalledTimes(1);
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

  it('calls loadingCount.stop()', () => {
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    const [loadingCountService] = MockLoadingCountService.mock.instances;
    expect(loadingCountService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(loadingCountService.stop).toHaveBeenCalled();
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

    core.start();
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

  it('calls loadingCount#start()', () => {
    startCore();
    const [mockInstance] = MockLoadingCountService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({
      fatalErrors: mockFatalErrorsStartContract,
    });
  });

  it('calls basePath#start()', () => {
    startCore();
    const [mockInstance] = MockBasePathService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({
      injectedMetadata: mockInjectedMetadataStartContract,
    });
  });

  it('calls uiSettings#start()', () => {
    startCore();
    const [mockInstance] = MockUiSettingsService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({
      notifications: mockNotificationStartContract,
      loadingCount: mockLoadingCountContract,
      injectedMetadata: mockInjectedMetadataStartContract,
      basePath: mockBasePathStartContract,
    });
  });

  it('calls fatalErrors#start()', () => {
    startCore();
    const [mockInstance] = MockFatalErrorsService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith();
  });

  it('calls notifications#start()', () => {
    startCore();
    const [mockInstance] = MockNotificationsService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith();
  });

  it('calls chrome#start()', () => {
    startCore();
    const [mockInstance] = MockChromeService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith();
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
