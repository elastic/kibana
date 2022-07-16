/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';

import { toMountPoint } from '../../../shared_imports';
import { isQuotaExceededError } from '../../../services/history';
import { instance as registry } from '../../contexts/editor_context/editor_registry';
import { useRequestActionContext, useServicesContext } from '../../contexts';
import { StorageQuotaError } from '../../components/storage_quota_error';
import { sendRequest } from './send_request';
import { track } from './track';
import { replaceVariables } from '../../../lib/utils';
import { StorageKeys } from '../../../services';
import { DEFAULT_VARIABLES } from '../../../../common/constants';

export const useSendCurrentRequest = () => {
  const {
    services: { history, settings, notifications, trackUiMetric, http, autocompleteInfo, storage },
    theme$,
  } = useServicesContext();

  const dispatch = useRequestActionContext();

  return useCallback(async () => {
    try {
      const editor = registry.getInputEditor();
      const variables = storage.get(StorageKeys.VARIABLES, DEFAULT_VARIABLES);
      let requests = await editor.getRequestsInRange();
      requests = replaceVariables(requests, variables);
      if (!requests.length) {
        notifications.toasts.add(
          i18n.translate('console.notification.error.noRequestSelectedTitle', {
            defaultMessage:
              'No request selected. Select a request by placing the cursor inside it.',
          })
        );
        return;
      }

      dispatch({ type: 'sendRequest', payload: undefined });

      // Fire and forget
      setTimeout(() => track(requests, editor, trackUiMetric), 0);

      const results = await sendRequest({ http, requests });

      let saveToHistoryError: undefined | Error;
      const { isHistoryDisabled } = settings.toJSON();

      if (!isHistoryDisabled) {
        results.forEach(({ request: { path, method, data } }) => {
          try {
            history.addToHistory(path, method, data);
          } catch (e) {
            // Grab only the first error
            if (!saveToHistoryError) {
              saveToHistoryError = e;
            }
          }
        });
      }

      if (saveToHistoryError) {
        const errorTitle = i18n.translate('console.notification.error.couldNotSaveRequestTitle', {
          defaultMessage: 'Could not save request to Console history.',
        });
        if (isQuotaExceededError(saveToHistoryError)) {
          const toast = notifications.toasts.addWarning({
            title: i18n.translate('console.notification.error.historyQuotaReachedMessage', {
              defaultMessage:
                'Request history is full. Clear the console history or disable saving new requests.',
            }),
            text: toMountPoint(
              StorageQuotaError({
                onClearHistory: () => {
                  history.clearHistory();
                  notifications.toasts.remove(toast);
                },
                onDisableSavingToHistory: () => {
                  settings.setIsHistoryDisabled(true);
                  notifications.toasts.remove(toast);
                },
              }),
              { theme$ }
            ),
          });
        } else {
          // Best effort, but still notify the user.
          notifications.toasts.addError(saveToHistoryError, {
            title: errorTitle,
          });
        }
      }

      const { polling } = settings.toJSON();
      if (polling) {
        // If the user has submitted a request against ES, something in the fields, indices, aliases,
        // or templates may have changed, so we'll need to update this data. Assume that if
        // the user disables polling they're trying to optimize performance or otherwise
        // preserve resources, so they won't want this request sent either.
        autocompleteInfo.retrieve(settings, settings.getAutocomplete());
      }

      dispatch({
        type: 'requestSuccess',
        payload: {
          data: results,
        },
      });
    } catch (e) {
      if (e?.response) {
        dispatch({
          type: 'requestFail',
          payload: e,
        });
      } else {
        dispatch({
          type: 'requestFail',
          payload: undefined,
        });
        notifications.toasts.addError(e, {
          title: i18n.translate('console.notification.error.unknownErrorTitle', {
            defaultMessage: 'Unknown Request Error',
          }),
        });
      }
    }
  }, [
    storage,
    dispatch,
    http,
    settings,
    notifications.toasts,
    trackUiMetric,
    history,
    theme$,
    autocompleteInfo,
  ]);
};
