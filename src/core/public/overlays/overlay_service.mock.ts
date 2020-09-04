/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
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
