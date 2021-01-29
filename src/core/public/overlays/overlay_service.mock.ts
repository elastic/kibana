/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { OverlayService, OverlayStart } from './overlay_service';
import { overlayBannersServiceMock } from './banners/banners_service.mock';
import { overlayFlyoutServiceMock } from './flyout/flyout_service.mock';
import { overlayModalServiceMock } from './modal/modal_service.mock';

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
