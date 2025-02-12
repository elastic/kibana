/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { OverlayFlyoutStart } from '@kbn/core-overlays-browser';
import type { FlyoutService } from '@kbn/core-overlays-browser-internal';

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
