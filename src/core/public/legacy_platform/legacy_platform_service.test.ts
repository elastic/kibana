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

const mockLoadOrder: string[] = [];

jest.mock('ui/metadata', () => {
  mockLoadOrder.push('ui/metadata');
  return {
    __newPlatformInit__: jest.fn(),
  };
});

jest.mock('ui/chrome', () => {
  mockLoadOrder.push('ui/chrome');
  return {
    bootstrap: jest.fn(),
  };
});

jest.mock('ui/test_harness', () => {
  mockLoadOrder.push('ui/test_harness');
  return {
    bootstrap: jest.fn(),
  };
});

import { LegacyPlatformService } from './legacy_platform_service';

beforeEach(() => {
  jest.clearAllMocks();
  injectedMetadataStartContract.getLegacyMetadata.mockReset();
  jest.resetModules();
  mockLoadOrder.length = 0;
});

const injectedMetadataStartContract = {
  getLegacyMetadata: jest.fn(),
};

const requireLegacyFiles = jest.fn(() => {
  mockLoadOrder.push('legacy files');
});

describe('#start()', () => {
  describe('default', () => {
    it('does not return a start contract', () => {
      const legacyPlatform = new LegacyPlatformService({
        rootDomElement: null!,
        requireLegacyFiles,
      });

      const startContract = legacyPlatform.start({
        injectedMetadata: injectedMetadataStartContract,
      });
      expect(startContract).toBe(undefined);
    });

    it('passes legacy metadata from injectedVars to ui/metadata', () => {
      const legacyMetadata = { isLegacyMetadata: true };
      injectedMetadataStartContract.getLegacyMetadata.mockReturnValue(legacyMetadata);

      const legacyPlatform = new LegacyPlatformService({
        rootDomElement: null!,
        requireLegacyFiles,
      });

      legacyPlatform.start({
        injectedMetadata: injectedMetadataStartContract,
      });

      const newPlatformInit = require('ui/metadata').__newPlatformInit__;
      expect(newPlatformInit).toHaveBeenCalledTimes(1);
      expect(newPlatformInit).toHaveBeenCalledWith(legacyMetadata);
    });
  });

  describe('load order', () => {
    describe('useLegacyTestHarness = false', () => {
      it('loads ui/modules before ui/chrome, and both before legacy files', () => {
        const legacyPlatform = new LegacyPlatformService({
          rootDomElement: null!,
          requireLegacyFiles,
        });

        expect(mockLoadOrder).toEqual([]);

        legacyPlatform.start({
          injectedMetadata: injectedMetadataStartContract,
        });

        expect(mockLoadOrder).toEqual(['ui/metadata', 'ui/chrome', 'legacy files']);
      });
    });

    describe('useLegacyTestHarness = true', () => {
      it('loads ui/modules before ui/test_harness, and both before legacy files', () => {
        const legacyPlatform = new LegacyPlatformService({
          rootDomElement: null!,
          requireLegacyFiles,
          useLegacyTestHarness: true,
        });

        expect(mockLoadOrder).toEqual([]);

        legacyPlatform.start({
          injectedMetadata: injectedMetadataStartContract,
        });

        expect(mockLoadOrder).toEqual(['ui/metadata', 'ui/test_harness', 'legacy files']);
      });
    });
  });
});
