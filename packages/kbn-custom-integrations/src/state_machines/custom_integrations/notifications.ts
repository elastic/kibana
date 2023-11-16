/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createNotificationChannel, NotificationChannel } from '@kbn/xstate-utils';
import { CreateCustomIntegrationNotificationEvent } from '../create/notifications';
import { CustomIntegrationsContext, CustomIntegrationsEvent } from './types';

export type CustomIntegrationsNotificationChannel = NotificationChannel<
  CustomIntegrationsContext,
  CustomIntegrationsEvent | CreateCustomIntegrationNotificationEvent,
  CustomIntegrationsEvent | CreateCustomIntegrationNotificationEvent
>;

export const createCustomIntegrationsNotificationChannel = () => {
  return createNotificationChannel<
    CustomIntegrationsContext,
    CustomIntegrationsEvent | CreateCustomIntegrationNotificationEvent,
    CustomIntegrationsEvent | CreateCustomIntegrationNotificationEvent
  >(false);
};
