/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  UserProfileServiceSetup,
  UserProfileServiceStart,
  UserProfileRequestHandlerContext,
} from '@kbn/core-user-profile-server';
import type {
  InternalUserProfileServiceSetup,
  InternalUserProfileServiceStart,
} from '@kbn/core-user-profile-server-internal';

const createSetupMock = () => {
  const mock: jest.Mocked<UserProfileServiceSetup> = {
    registerUserProfileDelegate: jest.fn(),
  };

  return mock;
};

const createStartMock = () => {
  const mock: jest.Mocked<UserProfileServiceStart> = {
    getCurrent: jest.fn(),
    bulkGet: jest.fn(),
    suggest: jest.fn(),
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
    getCurrent: jest.fn(),
    bulkGet: jest.fn(),
    suggest: jest.fn(),
    update: jest.fn(),
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

const createRequestHandlerContextMock = () => {
  const mock: jest.Mocked<UserProfileRequestHandlerContext> = {
    getCurrent: jest.fn(),
  };

  return mock;
};

export const userProfileServiceMock = {
  create: createServiceMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
  createInternalSetup: createInternalSetupMock,
  createInternalStart: createInternalStartMock,
  createRequestHandlerContext: createRequestHandlerContextMock,
};
