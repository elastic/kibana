/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { OverlayBannersStart, OverlayBannersService } from './banners_service';

const createStartContractMock = () => {
  const startContract: jest.Mocked<OverlayBannersStart> = {
    add: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
    get$: jest.fn(),
    getComponent: jest.fn(),
  };
  return startContract;
};

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<OverlayBannersService>> = {
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const overlayBannersServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
