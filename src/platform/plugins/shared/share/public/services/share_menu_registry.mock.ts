/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  ShareRegistry,
  ShareMenuRegistrySetup,
  ShareMenuRegistryStart,
} from './share_menu_registry';
import { ShareContext, ShareConfigs, ShareActionIntents } from '../types';

const createSetupMock = (): jest.Mocked<ShareMenuRegistrySetup> => {
  const setup = {
    register: jest.fn(),
    registerShareIntegration: jest.fn(),
  };
  return setup;
};

const createStartMock = (): jest.Mocked<ShareMenuRegistryStart> => {
  const start = {
    availableIntegrations: jest.fn(
      (_objectType: string, _groupId?: string) => [] as ShareActionIntents[]
    ),
    resolveShareItemsForShareContext: jest.fn(
      (_props: ShareContext & { isServerless: boolean }) => [] as ShareConfigs[]
    ),
  };
  return start;
};

const createMock = (): jest.Mocked<PublicMethodsOf<ShareRegistry>> => {
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
