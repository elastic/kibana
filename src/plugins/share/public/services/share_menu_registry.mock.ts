/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  ShareMenuRegistry,
  ShareMenuRegistrySetup,
  ShareMenuRegistryStart,
} from './share_menu_registry';
import { ShareMenuItem, ShareContext } from '../types';

const createSetupMock = (): jest.Mocked<ShareMenuRegistrySetup> => {
  const setup = {
    register: jest.fn(),
  };
  return setup;
};

const createStartMock = (): jest.Mocked<ShareMenuRegistryStart> => {
  const start = {
    getShareMenuItems: jest.fn((props: ShareContext) => [] as ShareMenuItem[]),
  };
  return start;
};

const createMock = (): jest.Mocked<PublicMethodsOf<ShareMenuRegistry>> => {
  const service = {
    setup: jest.fn(),
    start: jest.fn(),
  };
  service.setup.mockImplementation(createSetupMock);
  service.start.mockImplementation(createStartMock);
  return service;
};

export const shareMenuRegistryMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  create: createMock,
};
