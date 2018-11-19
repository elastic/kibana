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
import * as Rx from 'rxjs';

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

const mockLoadingCountInit = jest.fn();
jest.mock('ui/chrome/api/loading_count', () => {
  mockLoadOrder.push('ui/chrome/api/loading_count');
  return {
    __newPlatformInit__: mockLoadingCountInit,
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

const mockChromeThemeInit = jest.fn();
jest.mock('ui/chrome/api/theme', () => {
  mockLoadOrder.push('ui/chrome/api/theme');
  return {
    __newPlatformInit__: mockChromeThemeInit,
  };
});

const mockGlobalNavStateInit = jest.fn();
jest.mock('ui/chrome/services/global_nav_state', () => {
  mockLoadOrder.push('ui/chrome/services/global_nav_state');
  return {
    __newPlatformInit__: mockGlobalNavStateInit,
  };
});

import { LegacyPlatformService } from './legacy_platform_service';

const fatalErrorsStartContract = {} as any;
const notificationsStartContract = {
  toasts: {},
} as any;

const injectedMetadataStartContract: any = {
  getBasePath: jest.fn(),
  getLegacyMetadata: jest.fn(),
};

const loadingCountStartContract = {
  add: jest.fn(),
  getCount$: jest.fn().mockImplementation(() => new Rx.Observable(observer => observer.next(0))),
};

const basePathStartContract = {
  get: jest.fn(),
  addToPath: jest.fn(),
  removeFromPath: jest.fn(),
};

const uiSettingsStartContract: any = {};
const chromeStartContract: any = {};

const defaultParams = {
  targetDomElement: document.createElement('div'),
  requireLegacyFiles: jest.fn(() => {
    mockLoadOrder.push('legacy files');
  }),
};

const defaultStartDeps = {
  fatalErrors: fatalErrorsStartContract,
  injectedMetadata: injectedMetadataStartContract,
  notifications: notificationsStartContract,
  loadingCount: loadingCountStartContract,
  basePath: basePathStartContract,
  uiSettings: uiSettingsStartContract,
  chrome: chromeStartContract,
};

afterEach(() => {
  jest.clearAllMocks();
  injectedMetadataStartContract.getLegacyMetadata.mockReset();
  jest.resetModules();
  mockLoadOrder.length = 0;
});

describe('#start()', () => {
  describe('default', () => {
    it('passes legacy metadata from injectedVars to ui/metadata', () => {
      const legacyMetadata = { isLegacyMetadata: true };
      injectedMetadataStartContract.getLegacyMetadata.mockReturnValue(legacyMetadata);

      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockUiMetadataInit).toHaveBeenCalledTimes(1);
      expect(mockUiMetadataInit).toHaveBeenCalledWith(legacyMetadata);
    });

    it('passes fatalErrors service to ui/notify/fatal_errors', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockFatalErrorInit).toHaveBeenCalledTimes(1);
      expect(mockFatalErrorInit).toHaveBeenCalledWith(fatalErrorsStartContract);
    });

    it('passes toasts service to ui/notify/toasts', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockNotifyToastsInit).toHaveBeenCalledTimes(1);
      expect(mockNotifyToastsInit).toHaveBeenCalledWith(notificationsStartContract.toasts);
    });

    it('passes loadingCount service to ui/chrome/api/loading_count', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockLoadingCountInit).toHaveBeenCalledTimes(1);
      expect(mockLoadingCountInit).toHaveBeenCalledWith(loadingCountStartContract);
    });

    it('passes basePath service to ui/chrome/api/base_path', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockBasePathInit).toHaveBeenCalledTimes(1);
      expect(mockBasePathInit).toHaveBeenCalledWith(basePathStartContract);
    });

    it('passes basePath service to ui/chrome/api/ui_settings', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockUiSettingsInit).toHaveBeenCalledTimes(1);
      expect(mockUiSettingsInit).toHaveBeenCalledWith(uiSettingsStartContract);
    });

    it('passes injectedMetadata service to ui/chrome/api/injected_vars', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockInjectedVarsInit).toHaveBeenCalledTimes(1);
      expect(mockInjectedVarsInit).toHaveBeenCalledWith(injectedMetadataStartContract);
    });

    it('passes chrome service to ui/chrome/api/controls', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockChromeControlsInit).toHaveBeenCalledTimes(1);
      expect(mockChromeControlsInit).toHaveBeenCalledWith(chromeStartContract);
    });

    it('passes chrome service to ui/chrome/api/theme', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockChromeThemeInit).toHaveBeenCalledTimes(1);
      expect(mockChromeThemeInit).toHaveBeenCalledWith(chromeStartContract);
    });

    it('passes chrome service to ui/chrome/api/global_nav_state', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start(defaultStartDeps);

      expect(mockGlobalNavStateInit).toHaveBeenCalledTimes(1);
      expect(mockGlobalNavStateInit).toHaveBeenCalledWith(chromeStartContract);
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

  it('destroys the angular scope and empties the targetDomElement if angular is bootstraped to targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const scopeDestroySpy = jest.fn();

    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
      targetDomElement,
    });

    // simulate bootstraping with a module "foo"
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
