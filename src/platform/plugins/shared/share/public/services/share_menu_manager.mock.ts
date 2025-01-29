/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { ShareMenuManager, ShareMenuManagerStart } from './share_menu_manager';

const createStartMock = (): jest.Mocked<ShareMenuManagerStart> => {
  const start = {
    toggleShareContextMenu: jest.fn(),
  };
  return start;
};

const createMock = (): jest.Mocked<PublicMethodsOf<ShareMenuManager>> => {
  const service = {
    start: jest.fn(),
  };
  service.start.mockImplementation(createStartMock);
  return service;
};

export const shareMenuManagerMock = {
  createStart: createStartMock,
  create: createMock,
};
