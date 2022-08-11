/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
    onGetError: (error: Error) => {
      toasts.addError(error, {
        title: restoreUrlErrorTitle,
      });
    },
    onSetError: (error: Error) => {
      toasts.addError(error, {
        title: saveStateInUrlErrorTitle,
      });
    },
  };
};
