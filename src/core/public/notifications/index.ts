/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export { NotificationsService } from './notifications_service';
export type {
  ErrorToastOptions,
  ToastOptions,
  Toast,
  ToastInput,
  IToasts,
  ToastsApi,
  ToastInputFields,
  ToastsSetup,
  ToastsStart,
} from './toasts';
export type { NotificationsSetup, NotificationsStart } from './notifications_service';
