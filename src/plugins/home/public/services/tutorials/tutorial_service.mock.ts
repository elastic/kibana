/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { TutorialService, TutorialServiceSetup } from './tutorial_service';

const createSetupMock = (): jest.Mocked<TutorialServiceSetup> => {
  const setup = {
    setVariable: jest.fn(),
    registerDirectoryNotice: jest.fn(),
    registerDirectoryHeaderLink: jest.fn(),
    registerModuleNotice: jest.fn(),
  };
  return setup;
};

const createMock = (): jest.Mocked<PublicMethodsOf<TutorialService>> => {
  const service = {
    setup: jest.fn(),
    getVariables: jest.fn(() => ({})),
    getDirectoryNotices: jest.fn(() => []),
    getDirectoryHeaderLinks: jest.fn(() => []),
    getModuleNotices: jest.fn(() => []),
  };
  service.setup.mockImplementation(createSetupMock);
  return service;
};

export const tutorialServiceMock = {
  createSetup: createSetupMock,
  create: createMock,
};
