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

import angular from 'angular';

const mockLoadOrder: string[] = [];

const mockUiNewPlatformSetup = jest.fn();
const mockUiNewPlatformStart = jest.fn();
jest.mock('ui/new_platform', () => {
  mockLoadOrder.push('ui/new_platform');
  return {
    __setup__: mockUiNewPlatformSetup,
    __start__: mockUiNewPlatformStart,
  };
});

const mockUiChromeBootstrap = jest.fn();
jest.mock('ui/chrome', () => {
  mockLoadOrder.push('ui/chrome');
  return {
    bootstrap: mockUiChromeBootstrap,
  };
});

const mockUiTestHarnessBootstrap = jest.fn();
jest.mock('ui/test_harness', () => {
  mockLoadOrder.push('ui/test_harness');
  return {
    bootstrap: mockUiTestHarnessBootstrap,
  };
});

import { chromeServiceMock } from '../chrome/chrome_service.mock';
import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { i18nServiceMock } from '../i18n/i18n_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { notificationServiceMock } from '../notifications/notifications_service.mock';
import { overlayServiceMock } from '../overlays/overlay_service.mock';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { LegacyPlatformService } from './legacy_service';
import { applicationServiceMock } from '../application/application_service.mock';
import { docLinksServiceMock } from '../doc_links/doc_links_service.mock';
import { savedObjectsServiceMock } from '../saved_objects/saved_objects_service.mock';
import { contextServiceMock } from '../context/context_service.mock';

const applicationSetup = applicationServiceMock.createInternalSetupContract();
const contextSetup = contextServiceMock.createSetupContract();
const fatalErrorsSetup = fatalErrorsServiceMock.createSetupContract();
const httpSetup = httpServiceMock.createSetupContract();
const injectedMetadataSetup = injectedMetadataServiceMock.createSetupContract();
const notificationsSetup = notificationServiceMock.createSetupContract();
const uiSettingsSetup = uiSettingsServiceMock.createSetupContract();

const defaultParams = {
  requireLegacyFiles: jest.fn(() => {
    mockLoadOrder.push('legacy files');
  }),
};

const defaultSetupDeps = {
  core: {
    application: applicationSetup,
    context: contextSetup,
    fatalErrors: fatalErrorsSetup,
    injectedMetadata: injectedMetadataSetup,
    notifications: notificationsSetup,
    http: httpSetup,
    uiSettings: uiSettingsSetup,
  },
  plugins: {},
};

const applicationStart = applicationServiceMock.createInternalStartContract();
const docLinksStart = docLinksServiceMock.createStartContract();
const httpStart = httpServiceMock.createStartContract();
const chromeStart = chromeServiceMock.createStartContract();
const i18nStart = i18nServiceMock.createStartContract();
const injectedMetadataStart = injectedMetadataServiceMock.createStartContract();
const notificationsStart = notificationServiceMock.createStartContract();
const overlayStart = overlayServiceMock.createStartContract();
const uiSettingsStart = uiSettingsServiceMock.createStartContract();
const savedObjectsStart = savedObjectsServiceMock.createStartContract();
const fatalErrorsStart = fatalErrorsServiceMock.createStartContract();
const mockStorage = { getItem: jest.fn() } as any;

const defaultStartDeps = {
  core: {
    application: applicationStart,
    docLinks: docLinksStart,
    http: httpStart,
    chrome: chromeStart,
    i18n: i18nStart,
    injectedMetadata: injectedMetadataStart,
    notifications: notificationsStart,
    overlays: overlayStart,
    uiSettings: uiSettingsStart,
    savedObjects: savedObjectsStart,
    fatalErrors: fatalErrorsStart,
  },
  lastSubUrlStorage: mockStorage,
  targetDomElement: document.createElement('div'),
  plugins: {},
};

afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockLoadOrder.length = 0;
});

describe('#setup()', () => {
  describe('default', () => {
    it('initializes ui/new_platform with core APIs', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.setup(defaultSetupDeps);

      expect(mockUiNewPlatformSetup).toHaveBeenCalledTimes(1);
      expect(mockUiNewPlatformSetup).toHaveBeenCalledWith(expect.any(Object), {});
    });
  });
});

describe('#start()', () => {
  it('fetches and sets legacy lastSubUrls', () => {
    chromeStart.navLinks.getAll.mockReturnValue([
      { id: 'link1', baseUrl: 'http://wowza.com/app1', legacy: true } as any,
    ]);
    mockStorage.getItem.mockReturnValue('http://wowza.com/app1/subUrl');
    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
    });

    legacyPlatform.setup(defaultSetupDeps);
    legacyPlatform.start({ ...defaultStartDeps, lastSubUrlStorage: mockStorage });

    expect(chromeStart.navLinks.update).toHaveBeenCalledWith('link1', {
      url: 'http://wowza.com/app1/subUrl',
    });
  });

  it('initializes ui/new_platform with core APIs', () => {
    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
    });

    legacyPlatform.setup(defaultSetupDeps);
    legacyPlatform.start(defaultStartDeps);

    expect(mockUiNewPlatformStart).toHaveBeenCalledTimes(1);
    expect(mockUiNewPlatformStart).toHaveBeenCalledWith(expect.any(Object), {});
  });

  it('resolves getStartServices with core and plugin APIs', async () => {
    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
    });

    legacyPlatform.setup(defaultSetupDeps);
    legacyPlatform.start(defaultStartDeps);

    const { getStartServices } = mockUiNewPlatformSetup.mock.calls[0][0];
    const [coreStart, pluginsStart] = await getStartServices();
    expect(coreStart).toEqual(expect.any(Object));
    expect(pluginsStart).toBe(defaultStartDeps.plugins);
  });

  describe('useLegacyTestHarness = false', () => {
    it('passes the targetDomElement to ui/chrome', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.setup(defaultSetupDeps);
      legacyPlatform.start(defaultStartDeps);

      expect(mockUiTestHarnessBootstrap).not.toHaveBeenCalled();
      expect(mockUiChromeBootstrap).toHaveBeenCalledTimes(1);
      expect(mockUiChromeBootstrap).toHaveBeenCalledWith(defaultStartDeps.targetDomElement);
    });
  });

  describe('useLegacyTestHarness = true', () => {
    it('passes the targetDomElement to ui/test_harness', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
        useLegacyTestHarness: true,
      });

      legacyPlatform.setup(defaultSetupDeps);
      legacyPlatform.start(defaultStartDeps);

      expect(mockUiChromeBootstrap).not.toHaveBeenCalled();
      expect(mockUiTestHarnessBootstrap).toHaveBeenCalledTimes(1);
      expect(mockUiTestHarnessBootstrap).toHaveBeenCalledWith(defaultStartDeps.targetDomElement);
    });
  });

  describe('load order', () => {
    describe('useLegacyTestHarness = false', () => {
      it('loads ui/modules before ui/chrome, and both before legacy files', () => {
        const legacyPlatform = new LegacyPlatformService({
          ...defaultParams,
        });

        expect(mockLoadOrder).toEqual([]);

        legacyPlatform.setup(defaultSetupDeps);
        legacyPlatform.start(defaultStartDeps);

        expect(mockLoadOrder).toMatchSnapshot();
      });
    });

    describe('useLegacyTestHarness = true', () => {
      it('loads ui/modules before ui/test_harness, and both before legacy files', () => {
        const legacyPlatform = new LegacyPlatformService({
          ...defaultParams,
          useLegacyTestHarness: true,
        });

        expect(mockLoadOrder).toEqual([]);

        legacyPlatform.setup(defaultSetupDeps);
        legacyPlatform.start(defaultStartDeps);

        expect(mockLoadOrder).toMatchSnapshot();
      });
    });
  });
});

describe('#stop()', () => {
  it('does nothing if angular was not bootstrapped to targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.innerHTML = `
      <h1>this should not be removed</h1>
    `;

    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
    });

    legacyPlatform.stop();
    expect(targetDomElement).toMatchSnapshot();
  });

  it('destroys the angular scope and empties the targetDomElement if angular is bootstrapped to targetDomElement', async () => {
    const targetDomElement = document.createElement('div');
    const scopeDestroySpy = jest.fn();

    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
    });

    // simulate bootstrapping with a module "foo"
    angular.module('foo', []).directive('bar', () => ({
      restrict: 'E',
      link($scope) {
        $scope.$on('$destroy', scopeDestroySpy);
      },
    }));

    targetDomElement.innerHTML = `
      <bar></bar>
    `;

    angular.bootstrap(targetDomElement, ['foo']);

    await legacyPlatform.setup(defaultSetupDeps);
    legacyPlatform.start({ ...defaultStartDeps, targetDomElement });
    legacyPlatform.stop();

    expect(targetDomElement).toMatchSnapshot();
    expect(scopeDestroySpy).toHaveBeenCalledTimes(1);
  });
});
