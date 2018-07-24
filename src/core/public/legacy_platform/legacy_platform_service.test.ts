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

const mockFatalErrorInit = jest.fn();
jest.mock('ui/notify/fatal_error', () => {
  mockLoadOrder.push('ui/notify/fatal_error');
  return {
    __newPlatformInit__: mockFatalErrorInit,
  };
});

import { LegacyPlatformService } from './legacy_platform_service';

const fatalErrorsStartContract = {} as any;

const injectedMetadataStartContract = {
  getLegacyMetadata: jest.fn(),
};

const defaultParams = {
  rootDomElement: { someDomElement: true } as any,
  requireLegacyFiles: jest.fn(() => {
    mockLoadOrder.push('legacy files');
  }),
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

      legacyPlatform.start({
        fatalErrors: fatalErrorsStartContract,
        injectedMetadata: injectedMetadataStartContract,
      });

      expect(mockUiMetadataInit).toHaveBeenCalledTimes(1);
      expect(mockUiMetadataInit).toHaveBeenCalledWith(legacyMetadata);
    });

    it('passes fatalErrors service to ui/notify/fatal_errors', () => {
      const legacyPlatform = new LegacyPlatformService({
        ...defaultParams,
      });

      legacyPlatform.start({
        fatalErrors: fatalErrorsStartContract,
        injectedMetadata: injectedMetadataStartContract,
      });

      expect(mockFatalErrorInit).toHaveBeenCalledTimes(1);
      expect(mockFatalErrorInit).toHaveBeenCalledWith(fatalErrorsStartContract);
    });

    describe('useLegacyTestHarness = false', () => {
      it('passes the rootDomElement to ui/chrome', () => {
        const legacyPlatform = new LegacyPlatformService({
          ...defaultParams,
        });

        legacyPlatform.start({
          fatalErrors: fatalErrorsStartContract,
          injectedMetadata: injectedMetadataStartContract,
        });

        expect(mockUiTestHarnessBootstrap).not.toHaveBeenCalled();
        expect(mockUiChromeBootstrap).toHaveBeenCalledTimes(1);
        expect(mockUiChromeBootstrap).toHaveBeenCalledWith(defaultParams.rootDomElement);
      });
    });
    describe('useLegacyTestHarness = true', () => {
      it('passes the rootDomElement to ui/test_harness', () => {
        const legacyPlatform = new LegacyPlatformService({
          ...defaultParams,
          useLegacyTestHarness: true,
        });

        legacyPlatform.start({
          fatalErrors: fatalErrorsStartContract,
          injectedMetadata: injectedMetadataStartContract,
        });

        expect(mockUiChromeBootstrap).not.toHaveBeenCalled();
        expect(mockUiTestHarnessBootstrap).toHaveBeenCalledTimes(1);
        expect(mockUiTestHarnessBootstrap).toHaveBeenCalledWith(defaultParams.rootDomElement);
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

        legacyPlatform.start({
          fatalErrors: fatalErrorsStartContract,
          injectedMetadata: injectedMetadataStartContract,
        });

        expect(mockLoadOrder).toEqual([
          'ui/metadata',
          'ui/notify/fatal_error',
          'ui/chrome',
          'legacy files',
        ]);
      });
    });

    describe('useLegacyTestHarness = true', () => {
      it('loads ui/modules before ui/test_harness, and both before legacy files', () => {
        const legacyPlatform = new LegacyPlatformService({
          ...defaultParams,
          useLegacyTestHarness: true,
        });

        expect(mockLoadOrder).toEqual([]);

        legacyPlatform.start({
          fatalErrors: fatalErrorsStartContract,
          injectedMetadata: injectedMetadataStartContract,
        });

        expect(mockLoadOrder).toEqual([
          'ui/metadata',
          'ui/notify/fatal_error',
          'ui/test_harness',
          'legacy files',
        ]);
      });
    });
  });
});

describe('#stop()', () => {
  it('does nothing if angular was not bootstrapped to rootDomElement', () => {
    const rootDomElement = document.createElement('div');
    rootDomElement.innerHTML = `
      <h1>foo</h1>
      <h2>bar</h2>
    `;

    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
      rootDomElement,
    });

    legacyPlatform.stop();
    expect(rootDomElement).toMatchSnapshot();
  });

  it('destroys the angular scope and empties the rootDomElement if angular is bootstraped to rootDomElement', () => {
    const rootDomElement = document.createElement('div');
    const scopeDestroySpy = jest.fn();

    const legacyPlatform = new LegacyPlatformService({
      ...defaultParams,
      rootDomElement,
    });

    // simulate bootstraping with a module "foo"
    angular.module('foo', []).directive('bar', () => ({
      restrict: 'E',
      link($scope) {
        $scope.$on('$destroy', scopeDestroySpy);
      },
    }));

    rootDomElement.innerHTML = `
      <bar></bar>
    `;

    angular.bootstrap(rootDomElement, ['foo']);

    legacyPlatform.stop();

    expect(rootDomElement).toMatchSnapshot();
    expect(scopeDestroySpy).toHaveBeenCalledTimes(1);
  });
});
