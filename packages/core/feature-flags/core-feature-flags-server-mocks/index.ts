/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { FeatureFlagsSetup, FeatureFlagsStart } from '@kbn/core-feature-flags-server';
import type {
  FeatureFlagsService,
  InternalFeatureFlagsSetup,
} from '@kbn/core-feature-flags-server-internal';

const createFeatureFlagsInternalSetup = (): jest.Mocked<InternalFeatureFlagsSetup> => {
  return {
    ...createFeatureFlagsSetup(),
    getOverrides: jest.fn().mockReturnValue({}),
  };
};

const createFeatureFlagsSetup = (): jest.Mocked<FeatureFlagsSetup> => {
  return {
    setProvider: jest.fn(),
    appendContext: jest.fn(),
  };
};

const createFeatureFlagsStart = (): jest.Mocked<FeatureFlagsStart> => {
  return {
    appendContext: jest.fn(),
    getBooleanValue: jest.fn().mockImplementation(async (_, fallback) => fallback),
    getNumberValue: jest.fn().mockImplementation(async (_, fallback) => fallback),
    getStringValue: jest.fn().mockImplementation(async (_, fallback) => fallback),
    getBooleanValue$: jest.fn(),
    getStringValue$: jest.fn(),
    getNumberValue$: jest.fn(),
  };
};

const createFeatureFlagsServiceMock = (): jest.Mocked<PublicMethodsOf<FeatureFlagsService>> => {
  return {
    setup: jest.fn().mockImplementation(createFeatureFlagsInternalSetup),
    start: jest.fn().mockImplementation(createFeatureFlagsStart),
    stop: jest.fn().mockImplementation(Promise.resolve),
  };
};

export const coreFeatureFlagsMock = {
  create: createFeatureFlagsServiceMock,
  createInternalSetup: createFeatureFlagsInternalSetup,
  createSetup: createFeatureFlagsSetup,
  createStart: createFeatureFlagsStart,
};
