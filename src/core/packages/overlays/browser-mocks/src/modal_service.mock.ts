/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { OverlayModalStart } from '@kbn/core-overlays-browser';
import type { ModalService } from '@kbn/core-overlays-browser-internal';

const createStartContractMock = () => {
  const startContract: jest.Mocked<OverlayModalStart> = {
    open: jest.fn().mockReturnValue({
      close: jest.fn(),
      onClose: Promise.resolve(),
    }),
    openConfirm: jest.fn().mockResolvedValue(true),
  };
  return startContract;
};

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<ModalService>> = {
    start: jest.fn(),
  };
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const overlayModalServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
