/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InternalUiServiceSetup, UiServiceSetup } from './types';

const createInternalSetupMock = () => {
  const mock: jest.Mocked<InternalUiServiceSetup> = {
    markAsRequired: jest.fn(),
    markAsRequiredFor: jest.fn(),
    registerApp: jest.fn(),
  };
  return mock;
};

const createSetupMock = () => {
  const mock: jest.Mocked<UiServiceSetup> = {
    markAsRequired: jest.fn(),
    markAsRequiredFor: jest.fn(),
    registerApp: jest.fn(),
  };
  return mock;
};

export const uiMocks = {
  createInternalSetup: createInternalSetupMock,
  createSetup: createSetupMock,
};
