/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { TutorialService, TutorialServiceSetup } from './tutorial_service';

const createSetupMock = (): jest.Mocked<TutorialServiceSetup> => {
  const setup = {
    setVariable: jest.fn(),
    registerDirectoryNotice: jest.fn(),
    registerDirectoryHeaderLink: jest.fn(),
    registerModuleNotice: jest.fn(),
    registerCustomStatusCheck: jest.fn(),
    registerCustomComponent: jest.fn(),
  };
  return setup;
};

const createMock = (): jest.Mocked<PublicMethodsOf<TutorialService>> => {
  const service = {
    setup: jest.fn(),
    getVariables: jest.fn(() => ({})),
    getDirectoryHeaderLinks: jest.fn(() => []),
    getModuleNotices: jest.fn(() => []),
    getCustomStatusCheck: jest.fn(),
    getCustomComponent: jest.fn(),
  };
  service.setup.mockImplementation(createSetupMock);
  return service;
};

export const tutorialServiceMock = {
  createSetup: createSetupMock,
  create: createMock,
};
