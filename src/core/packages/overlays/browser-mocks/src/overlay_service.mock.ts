/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { OverlayService } from '@kbn/core-overlays-browser-internal';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { overlayBannersServiceMock } from './banners_service.mock';
import { overlayFlyoutServiceMock } from './flyout_service.mock';
import { overlayModalServiceMock } from './modal_service.mock';

const createStartContractMock = () => {
  const overlayStart = overlayModalServiceMock.createStartContract();
  const startContract: DeeplyMockedKeys<OverlayStart> = {
    openFlyout: overlayFlyoutServiceMock.createStartContract().open,
    openModal: overlayStart.open,
    openConfirm: overlayStart.openConfirm,
    banners: overlayBannersServiceMock.createStartContract(),
  };
  return startContract;
};

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<OverlayService>> = {
    start: jest.fn(),
  };
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const overlayServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};
