/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentManagementPublicStart, ContentManagementPublicSetup } from './types';

const createSetupContract = (): ContentManagementPublicSetup => {
  return {
    registry: {
      register: jest.fn(),
    },
  };
};

const createStartContract = (): ContentManagementPublicStart => {
  return {
    client: {
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      mSearch: jest.fn(),
    } as unknown as ContentManagementPublicStart['client'],
    registry: {
      get: jest.fn(),
      getAll: jest.fn(),
    },
  };
};

export const contentManagementMock = {
  createSetupContract,
  createStartContract,
};
