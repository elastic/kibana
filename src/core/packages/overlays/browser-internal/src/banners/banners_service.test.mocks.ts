/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { InternalOverlayBannersStart } from './banners_service';

// internal duplicate of public mock for `createStartContractMock`
export const createStartContractMock = () => {
  const startContract: Mocked<InternalOverlayBannersStart> = {
    add: vi.fn(),
    remove: vi.fn(),
    replace: vi.fn(),
    get$: vi.fn(),
    getComponent: vi.fn(),
  };
  return startContract;
};

export const overlayBannersServiceMock = {
  createStartContract: createStartContractMock,
};
