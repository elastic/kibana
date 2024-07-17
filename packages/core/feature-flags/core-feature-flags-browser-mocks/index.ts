/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FeatureFlagsSetup, FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import type { FeatureFlagsService } from '@kbn/core-feature-flags-browser-internal';
import type { PublicMethodsOf } from '@kbn/utility-types';

const createFeatureFlagsSetup = (): jest.Mocked<FeatureFlagsSetup> => {
  return {
    setProvider: jest.fn(),
    appendContext: jest.fn().mockImplementation(Promise.resolve),
  };
};

const createFeatureFlagsStart = (): jest.Mocked<FeatureFlagsStart> => {
  return {
    addHandler: jest.fn(),
    appendContext: jest.fn().mockImplementation(Promise.resolve),
    getBooleanValue: jest.fn(),
    getNumberValue: jest.fn(),
    getStringValue: jest.fn(),
  };
};

const createFeatureFlagsServiceMock = (): jest.Mocked<PublicMethodsOf<FeatureFlagsService>> => {
  return {
    setup: jest.fn().mockImplementation(createFeatureFlagsSetup),
    start: jest.fn().mockImplementation(async () => createFeatureFlagsStart()),
    stop: jest.fn().mockImplementation(Promise.resolve),
  };
};

export const coreFeatureFlagsMock = {
  create: createFeatureFlagsServiceMock,
  createSetup: createFeatureFlagsSetup,
  createStart: createFeatureFlagsStart,
};
