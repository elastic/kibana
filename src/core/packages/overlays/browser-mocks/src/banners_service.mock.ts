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
  type InternalOverlayBannersStart,
  type OverlayBannersService,
} from '@kbn/core-overlays-browser-internal';
import { lazyObject } from '@kbn/lazy-object';

const createStartContractMock = () => {
  const startContract: jest.Mocked<InternalOverlayBannersStart> = lazyObject({
    add: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
    get$: jest.fn(),
    getComponent: jest.fn(),
  });

  return startContract;
};

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<OverlayBannersService>> = lazyObject({
    start: jest.fn().mockReturnValue(createStartContractMock()),
    stop: jest.fn(),
  });

  return mocked;
};

export const overlayBannersServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
