/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OverlayBannersStart } from './banners';
import type { OverlayFlyoutStart } from './flyout';
import type { OverlayModalStart } from './modal';
import type { OverlaySystemFlyoutStart } from './system_flyout';

/** @public */
export interface OverlayStart {
  /** {@link OverlayBannersStart} */
  banners: OverlayBannersStart;
  /** {@link OverlayFlyoutStart#open} */
  openFlyout: OverlayFlyoutStart['open'];
  /** Opens a system flyout that integrates with EUI Flyout Manager */
  openSystemFlyout: OverlaySystemFlyoutStart['open'];
  /** {@link OverlayModalStart#open} */
  openModal: OverlayModalStart['open'];
  /** {@link OverlayModalStart#openConfirm} */
  openConfirm: OverlayModalStart['openConfirm'];
}
