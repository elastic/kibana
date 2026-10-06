/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NotificationsStart } from '@kbn/core/public';
export declare const restoreUrlErrorTitle: string;
export declare const saveStateInUrlErrorTitle: string;
export declare const flushNotifyOnErrors: () => void;
/**
 * Helper for configuring {@link IKbnUrlStateStorage} to notify about inner errors
 *
 * @example
 * ```ts
 * const kbnUrlStateStorage = createKbnUrlStateStorage({
 *  history,
 *  ...withNotifyOnErrors(core.notifications.toast))
 * }
 * ```
 * @param toast - toastApi from core.notifications.toasts
 */
export declare const withNotifyOnErrors: (toasts: NotificationsStart['toasts']) => {
  onGetError: (e: Error) => void;
  onSetError: (e: Error) => void;
};
