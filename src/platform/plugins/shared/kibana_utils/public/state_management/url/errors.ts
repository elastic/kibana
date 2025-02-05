/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { throttle } from 'lodash';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from '@kbn/core/public';

export const restoreUrlErrorTitle = i18n.translate(
  'kibana_utils.stateManagement.url.restoreUrlErrorTitle',
  {
    defaultMessage: `Error restoring state from URL`,
  }
);

export const saveStateInUrlErrorTitle = i18n.translate(
  'kibana_utils.stateManagement.url.saveStateInUrlErrorTitle',
  {
    defaultMessage: `Error saving state in URL`,
  }
);

// Prevent toast storms by throttling. See https://github.com/elastic/kibana/issues/153073
const throttledOnRestoreError = throttle((toasts: NotificationsStart['toasts'], e: Error) => {
  toasts.addError(e, {
    title: restoreUrlErrorTitle,
  });
}, 10000);
const throttledOnSaveError = throttle((toasts: NotificationsStart['toasts'], e: Error) => {
  toasts.addError(e, {
    title: saveStateInUrlErrorTitle,
  });
}, 10000);

// Helper to bypass throttling if consumers need to handle errors right away
export const flushNotifyOnErrors = () => {
  throttledOnRestoreError.flush();
  throttledOnSaveError.flush();
};

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
export const withNotifyOnErrors = (toasts: NotificationsStart['toasts']) => {
  return {
    onGetError: (e: Error) => throttledOnRestoreError(toasts, e),
    onSetError: (e: Error) => throttledOnSaveError(toasts, e),
  };
};
