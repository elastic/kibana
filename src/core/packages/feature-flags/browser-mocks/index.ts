/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeatureFlagsSetup, FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import type { FeatureFlagsService } from '@kbn/core-feature-flags-browser-internal';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { of } from 'rxjs';

const createFeatureFlagsSetup = (): jest.Mocked<FeatureFlagsSetup> => {
  return {
    setProvider: jest.fn(),
    appendContext: jest.fn().mockImplementation(Promise.resolve),
  };
};

const createFeatureFlagsStart = (): jest.Mocked<FeatureFlagsStart> => {
  return {
    appendContext: jest.fn().mockImplementation(Promise.resolve),
    getBooleanValue: jest.fn().mockImplementation(async (_, fallback) => fallback),
    getNumberValue: jest.fn().mockImplementation(async (_, fallback) => fallback),
    getStringValue: jest.fn().mockImplementation(async (_, fallback) => fallback),
    getBooleanValue$: jest.fn().mockImplementation((_, fallback) => of(fallback)),
    getStringValue$: jest.fn().mockImplementation((_, fallback) => of(fallback)),
    getNumberValue$: jest.fn().mockImplementation((_, fallback) => of(fallback)),
  };
};

const createFeatureFlagsServiceMock = (): jest.Mocked<PublicMethodsOf<FeatureFlagsService>> => {
  return {
    setup: jest.fn().mockImplementation(createFeatureFlagsSetup),
    start: jest.fn().mockImplementation(async () => createFeatureFlagsStart()),
    stop: jest.fn().mockImplementation(Promise.resolve),
  };
};

/**
 * Mocks for the Feature Flags service (browser-side)
 */
export const coreFeatureFlagsMock = {
  /**
   * Mocks the entire feature flags service
   */
  create: createFeatureFlagsServiceMock,
  /**
   * Mocks the setup contract
   */
  createSetup: createFeatureFlagsSetup,
  /**
   * Mocks the start contract
   */
  createStart: createFeatureFlagsStart,
};
