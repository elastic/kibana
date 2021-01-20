/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { FlyoutService, OverlayFlyoutStart } from './flyout_service';

const createStartContractMock = () => {
  const startContract: jest.Mocked<OverlayFlyoutStart> = {
    open: jest.fn().mockReturnValue({
      close: jest.fn(),
      onClose: Promise.resolve(),
    }),
  };
  return startContract;
};

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<FlyoutService>> = {
    start: jest.fn(),
  };
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const overlayFlyoutServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
