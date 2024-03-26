/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { decompressFromEncodedURIComponent } from 'lz-string';
import { i18n } from '@kbn/i18n';
import { NotificationsSetup } from '@kbn/core-notifications-browser';

export interface LoadBufferFromRemoteParams {
  /** The text value that is initially in the console editor. */
  initialTextValue?: string;
  /** The function that sets the state of the value in the console editor. */
  setValue: (value: string) => void;
  /** The notifications service. */
  notifications: NotificationsSetup;
}

/**
 * Returns a hook to extract the data from the provided url and set the Console editor input to this data.
 *
 * @param params The {@link LoadBufferFromRemoteParams} to use.
 */
export const useLoadBufferFromRemote = (params: LoadBufferFromRemoteParams) => {
  const { initialTextValue, setValue, notifications } = params;
  return (url: string) => {
    // Normalize and encode the URL to avoid issues with spaces and other special characters.
    const encodedUrl = new URL(url).toString();
    if (/^https?:\/\//.test(encodedUrl)) {
      const loadFrom: Record<string, any> = {
        url,
        // Having dataType here is required as it doesn't allow jQuery to `eval` content
        // coming from the external source thereby preventing XSS attack.
        dataType: 'text',
        kbnXsrfToken: false,
      };

      // Fire and forget.
      $.ajax(loadFrom).done((data) => {
        // when we load data from another Api we also must pass history
        setValue(`${initialTextValue}\n ${data}`);
      });
    }

    // If we have a data URI instead of HTTP, LZ-decode it. This enables
    // opening requests in Console from anywhere in Kibana.
    if (/^data:/.test(url)) {
      const data = decompressFromEncodedURIComponent(url.replace(/^data:text\/plain,/, ''));

      // Show a toast if we have a failure
      if (data === null || data === '') {
        notifications.toasts.addWarning(
          i18n.translate('console.loadFromDataUriErrorMessage', {
            defaultMessage: 'Unable to load data from the load_from query parameter in the URL',
          })
        );
        return;
      }

      setValue(data);
    }
  };
};
