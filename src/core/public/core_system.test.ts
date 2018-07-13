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

jest.mock('./legacy_platform', () => ({
  LegacyPlatformService: jest.fn(function MockInjectedMetadataService(this: any) {
    this.start = jest.fn();
  }),
}));

const mockInjectedMetadataStartContract = {};
jest.mock('./injected_metadata', () => ({
  InjectedMetadataService: jest.fn(function MockInjectedMetadataService(this: any) {
    this.start = jest.fn().mockReturnValue(mockInjectedMetadataStartContract);
  }),
}));

import { CoreSystem } from './core_system';
import { InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformService } from './legacy_platform';

const defaultCoreSystemParams = {
  rootDomElement: null!,
  injectedMetadata: {} as any,
  requireLegacyFiles: jest.fn(),
};

function getFirstStartMethodMock<
  T extends typeof InjectedMetadataService | typeof LegacyPlatformService
>(Service: T): jest.MockInstance<T['prototype']['start']> {
  const mockService: jest.MockInstance<T['prototype']> = Service as any;
  return mockService.mock.instances[0].start as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('constructor', () => {
  it('creates instances of services', () => {
    // tslint:disable no-unused-expression
    new CoreSystem({
      ...defaultCoreSystemParams,
    });

    expect(InjectedMetadataService).toHaveBeenCalledTimes(1);
    expect(LegacyPlatformService).toHaveBeenCalledTimes(1);
  });

  it('passes injectedMetadata param to InjectedMetadataService', () => {
    const injectedMetadata = { injectedMetadata: true } as any;

    // tslint:disable no-unused-expression
    new CoreSystem({
      ...defaultCoreSystemParams,
      injectedMetadata,
    });

    expect(InjectedMetadataService).toHaveBeenCalledTimes(1);
    expect(InjectedMetadataService).toHaveBeenCalledWith({
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

    expect(LegacyPlatformService).toHaveBeenCalledTimes(1);
    expect(LegacyPlatformService).toHaveBeenCalledWith({
      rootDomElement,
      requireLegacyFiles,
      useLegacyTestHarness,
    });
  });
});

describe('#start()', () => {
  it('calls lifecycleSystem#start() and injectedMetadata#start()', () => {
    const core = new CoreSystem({
      ...defaultCoreSystemParams,
    });

    expect(core.start()).toBe(undefined);

    const injectedMetadataStartMock = getFirstStartMethodMock(InjectedMetadataService);
    expect(injectedMetadataStartMock).toHaveBeenCalledTimes(1);
    expect(injectedMetadataStartMock).toHaveBeenCalledWith();

    const legacyPlatformStartMock = getFirstStartMethodMock(LegacyPlatformService);
    expect(legacyPlatformStartMock).toHaveBeenCalledTimes(1);
    expect(legacyPlatformStartMock).toHaveBeenCalledWith({
      injectedMetadata: mockInjectedMetadataStartContract,
    });
  });
});
