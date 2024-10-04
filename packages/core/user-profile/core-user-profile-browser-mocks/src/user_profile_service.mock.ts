/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  UserProfileServiceSetup,
  UserProfileServiceStart,
} from '@kbn/core-user-profile-browser';
import type {
  InternalUserProfileServiceSetup,
  InternalUserProfileServiceStart,
} from '@kbn/core-user-profile-browser-internal';

const createSetupMock = () => {
  const mock: jest.Mocked<UserProfileServiceSetup> = {
    registerUserProfileDelegate: jest.fn(),
  };

  return mock;
};

const createStartMock = () => {
  const mock: jest.Mocked<UserProfileServiceStart> = {
    getUserProfile$: jest.fn(),
    getCurrent: jest.fn(),
    bulkGet: jest.fn(),
    suggest: jest.fn(),
    update: jest.fn(),
    partialUpdate: jest.fn(),
  };

  return mock;
};

const createInternalSetupMock = () => {
  const mock: jest.Mocked<InternalUserProfileServiceSetup> = {
    registerUserProfileDelegate: jest.fn(),
  };

  return mock;
};

const createInternalStartMock = () => {
  const mock: jest.Mocked<InternalUserProfileServiceStart> = {
    getUserProfile$: jest.fn(),
    getCurrent: jest.fn(),
    bulkGet: jest.fn(),
    suggest: jest.fn(),
    update: jest.fn(),
    partialUpdate: jest.fn(),
  };

  return mock;
};

const createServiceMock = () => {
  const mock = {
    setup: jest.fn().mockReturnValue(createSetupMock()),
    start: jest.fn().mockReturnValue(createStartMock()),
    stop: jest.fn(),
  };

  return mock;
};

export const userProfileServiceMock = {
  create: createServiceMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
  createInternalSetup: createInternalSetupMock,
  createInternalStart: createInternalStartMock,
};
