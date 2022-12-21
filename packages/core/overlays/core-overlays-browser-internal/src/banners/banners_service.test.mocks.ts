/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InternalOverlayBannersStart } from './banners_service';

// internal duplicate of public mock for `createStartContractMock`
export const createStartContractMock = () => {
  const startContract: jest.Mocked<InternalOverlayBannersStart> = {
    add: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
    get$: jest.fn(),
    getComponent: jest.fn(),
  };
  return startContract;
};

export const overlayBannersServiceMock = {
  createStartContract: createStartContractMock,
};
