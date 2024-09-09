/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardNotificationsService } from './types';

type NotificationsServiceFactory = PluginServiceFactory<DashboardNotificationsService>;

export const notificationsServiceFactory: NotificationsServiceFactory = () => {
  const pluginMock = notificationServiceMock.createStartContract();

  return {
    toasts: pluginMock.toasts,
    showErrorDialog: pluginMock.showErrorDialog,
  };
};
