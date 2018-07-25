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

import { FatalErrorsService } from './fatal_errors';
import { InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformService } from './legacy_platform';

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

import { CoreSystem } from './core_system';
jest.spyOn(CoreSystem.prototype, 'stop');

const defaultCoreSystemParams = {
  rootDomElement: null!,
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

  it('passes rootDomElement, requireLegacyFiles, and useLegacyTestHarness to LegacyPlatformService', () => {
    const rootDomElement = { rootDomElement: true } as any;
    const requireLegacyFiles = { requireLegacyFiles: true } as any;
    const useLegacyTestHarness = { useLegacyTestHarness: true } as any;

    // tslint:disable no-unused-expression
    new CoreSystem({
      ...defaultCoreSystemParams,
      rootDomElement,
      requireLegacyFiles,
      useLegacyTestHarness,
    });

    expect(MockLegacyPlatformService).toHaveBeenCalledTimes(1);
    expect(MockLegacyPlatformService).toHaveBeenCalledWith({
      rootDomElement,
      requireLegacyFiles,
      useLegacyTestHarness,
    });
  });

  it('passes injectedMetadata, rootDomElement, and a stopCoreSystem function to FatalErrorsService', () => {
    const rootDomElement = { rootDomElement: true } as any;
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
  it('call legacyPlatform.stop()', () => {
    const coreSystem = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    const legacyPlatformService = MockLegacyPlatformService.mock.instances[0];

    expect(legacyPlatformService.stop).not.toHaveBeenCalled();
    coreSystem.stop();
    expect(legacyPlatformService.stop).toHaveBeenCalled();
  });
});

describe('#start()', () => {
  function startCore() {
    const core = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    core.start();
  }

  it('calls injectedMetadata#start()', () => {
    startCore();
    const [mockInstance] = MockInjectedMetadataService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith();
  });

  it('calls fatalErrors#start()', () => {
    startCore();
    const [mockInstance] = MockFatalErrorsService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith();
  });

  it('calls legacyPlatform#start()', () => {
    startCore();
    const [mockInstance] = MockLegacyPlatformService.mock.instances;
    expect(mockInstance.start).toHaveBeenCalledTimes(1);
    expect(mockInstance.start).toHaveBeenCalledWith({
      injectedMetadata: mockInjectedMetadataStartContract,
      fatalErrors: mockFatalErrorsStartContract,
    });
  });
});
