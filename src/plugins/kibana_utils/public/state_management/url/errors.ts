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

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';

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
