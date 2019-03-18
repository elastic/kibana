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

const mockUiMetadataInit = jest.fn();
jest.mock('ui/metadata', () => {
  mockLoadOrder.push('ui/metadata');
  return {
    __newPlatformInit__: mockUiMetadataInit,
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

const mockI18nContextInit = jest.fn();
jest.mock('ui/i18n', () => {
  mockLoadOrder.push('ui/i18n');
  return {
    __newPlatformInit__: mockI18nContextInit,
  };
});

const mockFatalErrorInit = jest.fn();
jest.mock('ui/notify/fatal_error', () => {
  mockLoadOrder.push('ui/notify/fatal_error');
  return {
    __newPlatformInit__: mockFatalErrorInit,
  };
});

const mockNotifyToastsInit = jest.fn();
jest.mock('ui/notify/toasts', () => {
  mockLoadOrder.push('ui/notify/toasts');
  return {
    __newPlatformInit__: mockNotifyToastsInit,
  };
});

const mockHttpInit = jest.fn();
jest.mock('ui/chrome/api/loading_count', () => {
  mockLoadOrder.push('ui/chrome/api/loading_count');
  return {
    __newPlatformInit__: mockHttpInit,
  };
});

const mockBasePathInit = jest.fn();
jest.mock('ui/chrome/api/base_path', () => {
  mockLoadOrder.push('ui/chrome/api/base_path');
  return {
    __newPlatformInit__: mockBasePathInit,
  };
});

const mockUiSettingsInit = jest.fn();
jest.mock('ui/chrome/api/ui_settings', () => {
  mockLoadOrder.push('ui/chrome/api/ui_settings');
  return {
    __newPlatformInit__: mockUiSettingsInit,
  };
});

const mockInjectedVarsInit = jest.fn();
jest.mock('ui/chrome/api/injected_vars', () => {
  mockLoadOrder.push('ui/chrome/api/injected_vars');
  return {
    __newPlatformInit__: mockInjectedVarsInit,
  };
});

const mockChromeControlsInit = jest.fn();
jest.mock('ui/chrome/api/controls', () => {
  mockLoadOrder.push('ui/chrome/api/controls');
  return {
    __newPlatformInit__: mockChromeControlsInit,
  };
});

const mockChromeHelpExtensionInit = jest.fn();
jest.mock('ui/chrome/api/help_extension', () => {
  mockLoadOrder.push('ui/chrome/api/help_extension');
  return {
    __newPlatformInit__: mockChromeHelpExtensionInit,
  };
});

const mockChromeThemeInit = jest.fn();
jest.mock('ui/chrome/api/theme', () => {
  mockLoadOrder.push('ui/chrome/api/theme');
  return {
    __newPlatformInit__: mockChromeThemeInit,
  };
});

const mockChromeBreadcrumbsInit = jest.fn();
jest.mock('ui/chrome/api/breadcrumbs', () => {
  mockLoadOrder.push('ui/chrome/api/breadcrumbs');
  return {
    __newPlatformInit__: mockChromeBreadcrumbsInit,
  };
});

const mockGlobalNavStateInit = jest.fn();
jest.mock('ui/chrome/services/global_nav_state', () => {
  mockLoadOrder.push('ui/chrome/services/global_nav_state');
  return {
    __newPlatformInit__: mockGlobalNavStateInit,
  };
});

import { basePathServiceMock } from '../base_path/base_path_service.mock';
import { chromeServiceMock } from '../chrome/chrome_service.mock';
import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { i18nServiceMock } from '../i18n/i18n_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { notificationServiceMock } from '../notifications/notifications_service.mock';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { LegacyPlatformService } from './legacy_service';

const basePathStart = basePathServiceMock.createStartContract();
const chromeStart = chromeServiceMock.createStartContract();
const fatalErrorsStart = fatalErrorsServiceMock.createStartContract();
const httpStart = httpServiceMock.createStartContract();
const i18nStart = i18nServiceMock.createStartContract();
const injectedMetadataStart = injectedMetadataServiceMock.createStartContract();
const notificationsStart = notificationServiceMock.createStartContract();
const uiSettingsStart = uiSettingsServiceMock.createStartContract();

const defaultParams = {
  targetDomElement: document.createElement('div'),
  requireLegacyFiles: jest.fn(() => {
    mockLoadOrder.push('legacy files');
  }),
};

const defaultStartDeps = {
  i18n: i18nStart,
  fatalErrors: fatalErrorsStart,
  injectedMetadata: injectedMetadataStart,
  notifications: notificationsStart,
  http: httpStart,
  basePath: basePathStart,
  uiSettings: uiSettingsStart,
  chrome: chromeStart,
};

afterEach(() => {
  jest.clearAllMocks();
  injectedMetadataStart.getLegacyMetadata.mockReset();
  jest.resetModules();
  mockLoadOrder.length = 0;
});

describe('#start()', () => {
  describe('default', () => {
    it('passes legacy metadata from injectedVars to ui/metadata', () => {
      const legacyMetadata = { isLegacyMetadata: true };
      injectedMetadataStart.getLegacyMetadata.mockReturnValue(legacyMetadata as any);

      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockUiMetadataInit).toHaveBeenCalledTimes(1);
      expect(mockUiMetadataInit).toHaveBeenCalledWith(legacyMetadata);
    });

    it('passes i18n.Context to ui/i18n', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockI18nContextInit).toHaveBeenCalledTimes(1);
      expect(mockI18nContextInit).toHaveBeenCalledWith(i18nStart.Context);
    });

    it('passes fatalErrors service to ui/notify/fatal_errors', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockFatalErrorInit).toHaveBeenCalledTimes(1);
      expect(mockFatalErrorInit).toHaveBeenCalledWith(fatalErrorsStart);
    });

    it('passes toasts service to ui/notify/toasts', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockNotifyToastsInit).toHaveBeenCalledTimes(1);
      expect(mockNotifyToastsInit).toHaveBeenCalledWith(notificationsStart.toasts);
    });

    it('passes http service to ui/chrome/api/loading_count', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockHttpInit).toHaveBeenCalledTimes(1);
      expect(mockHttpInit).toHaveBeenCalledWith(httpStart);
    });

    it('passes basePath service to ui/chrome/api/base_path', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockBasePathInit).toHaveBeenCalledTimes(1);
      expect(mockBasePathInit).toHaveBeenCalledWith(basePathStart);
    });

    it('passes basePath service to ui/chrome/api/ui_settings', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockUiSettingsInit).toHaveBeenCalledTimes(1);
      expect(mockUiSettingsInit).toHaveBeenCalledWith(uiSettingsStart);
    });

    it('passes injectedMetadata service to ui/chrome/api/injected_vars', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockInjectedVarsInit).toHaveBeenCalledTimes(1);
      expect(mockInjectedVarsInit).toHaveBeenCalledWith(injectedMetadataStart);
    });

    it('passes chrome service to ui/chrome/api/controls', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockChromeControlsInit).toHaveBeenCalledTimes(1);
      expect(mockChromeControlsInit).toHaveBeenCalledWith(chromeStart);
    });

    it('passes chrome service to ui/chrome/api/help_extension', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockChromeHelpExtensionInit).toHaveBeenCalledTimes(1);
      expect(mockChromeHelpExtensionInit).toHaveBeenCalledWith(chromeStart);
    });

    it('passes chrome service to ui/chrome/api/theme', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockChromeThemeInit).toHaveBeenCalledTimes(1);
      expect(mockChromeThemeInit).toHaveBeenCalledWith(chromeStart);
    });

    it('passes chrome service to ui/chrome/api/breadcrumbs', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockChromeBreadcrumbsInit).toHaveBeenCalledTimes(1);
      expect(mockChromeBreadcrumbsInit).toHaveBeenCalledWith(chromeStart);
    });

    it('passes chrome service to ui/chrome/api/global_nav_state', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockGlobalNavStateInit).toHaveBeenCalledTimes(1);
      expect(mockGlobalNavStateInit).toHaveBeenCalledWith(chromeStart);
    });

    describe('useLegacyTestHarness = false', () => {
      it('passes the targetDomElement to ui/chrome', () => {
        const legacyPlatform = new LegacyPlatformService({
          ...defaultParams,
        });

        legacyPlatform.start(defaultStartDeps);

        expect(mockUiTestHarnessBootstrap).not.toHaveBeenCalled();
        expect(mockUiChromeBootstrap).toHaveBeenCalledTimes(1);
        expect(mockUiChromeBootstrap).toHaveBeenCalledWith(defaultParams.targetDomElement);
      });
    });

    describe('useLegacyTestHarness = true', () => {
      it('passes the targetDomElement to ui/test_harness', () => {
        const legacyPlatform = new LegacyPlatformService({
          ...defaultParams,
          useLegacyTestHarness: true,
        });

        legacyPlatform.start(defaultStartDeps);

        expect(mockUiChromeBootstrap).not.toHaveBeenCalled();
        expect(mockUiTestHarnessBootstrap).toHaveBeenCalledTimes(1);
        expect(mockUiTestHarnessBootstrap).toHaveBeenCalledWith(defaultParams.targetDomElement);
      });
    });
  });

  describe('load order', () => {
    describe('useLegacyTestHarness = false', () => {
      it('loads ui/modules before ui/chrome, and both before legacy files', () => {
        const legacyPlatform = new LegacyPlatformService({
          ...defaultParams,
        });

        expect(mockLoadOrder).toEqual([]);

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
      targetDomElement,
    });

    legacyPlatform.stop();
    expect(targetDomElement).toMatchSnapshot();
  });

  it('destroys the angular scope and empties the targetDomElement if angular is bootstrapped to targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const scopeDestroySpy = jest.fn();

    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
      targetDomElement,
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

    legacyPlatform.stop();

    expect(targetDomElement).toMatchSnapshot();
    expect(scopeDestroySpy).toHaveBeenCalledTimes(1);
  });
});
