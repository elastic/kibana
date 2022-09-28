/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardOverlaysService } from './types';

type OverlaysServiceFactory = PluginServiceFactory<DashboardOverlaysService>;

export const overlaysServiceFactory: OverlaysServiceFactory = () => {
  const pluginMock = overlayServiceMock.createStartContract();

  return {
    banners: pluginMock.banners,
    openConfirm: pluginMock.openConfirm,
    openFlyout: pluginMock.openFlyout,
    openModal: pluginMock.openModal,
  };
};
