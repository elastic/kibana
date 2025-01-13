/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import { parse } from 'query-string';
import { IToasts } from '@kbn/core-notifications-browser';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { i18n } from '@kbn/i18n';
import { useEffect, useRef } from 'react';
import { DEFAULT_INPUT_VALUE } from '../../../../../common/constants';

interface QueryParams {
  load_from: string;
}

interface SetInitialValueParams {
  /** The text value that is initially in the console editor. */
  localStorageValue?: string;
  /** The function that sets the state of the value in the console editor. */
  setValue: (value: string) => void;
  /** The toasts service. */
  toasts: IToasts;
}

/**
 * Util function for reading the load_from parameter from the current url.
 */

export const readLoadFromParam = () => {
  const [, queryString] = (window.location.hash || window.location.search || '').split('?');

  const queryParams = parse(queryString || '', { sort: false }) as Required<QueryParams>;
  return queryParams.load_from;
};

/**
 * Hook that sets the initial value in the Console editor.
 *
 * @param params The {@link SetInitialValueParams} to use.
 */
export const useSetInitialValue = (params: SetInitialValueParams) => {
  const { localStorageValue, setValue, toasts } = params;
  const isInitialValueSet = useRef<boolean>(false);

  useEffect(() => {
    const loadBufferFromRemote = async (url: string) => {
      if (/^https?:\/\//.test(url)) {
        // Check if this is a valid URL
        try {
          new URL(url);
        } catch (e) {
          return;
        }
        // Parse the URL to avoid issues with spaces and other special characters.
        const parsedURL = new URL(url);
        if (parsedURL.origin === 'https://www.elastic.co') {
          const resp = await fetch(parsedURL);
          const data = await resp.text();
          setValue(`${localStorageValue ?? ''}\n\n${data}`);
        } else {
          toasts.addWarning(
            i18n.translate('console.monaco.loadFromDataUnrecognizedUrlErrorMessage', {
              defaultMessage:
                'Only URLs with the Elastic domain (www.elastic.co) can be loaded in Console.',
            })
          );
        }
      }

      // If we have a data URI instead of HTTP, LZ-decode it. This enables
      // opening requests in Console from anywhere in Kibana.
      if (/^data:/.test(url)) {
        const data = decompressFromEncodedURIComponent(url.replace(/^data:text\/plain,/, ''));

        // Show a toast if we have a failure
        if (data === null || data === '') {
          toasts.addWarning(
            i18n.translate('console.monaco.loadFromDataUriErrorMessage', {
              defaultMessage: 'Unable to load data from the load_from query parameter in the URL',
            })
          );
          return;
        }

        setValue(data);
      }
    };

    // Support for loading a console snippet from a remote source, like support docs.
    const onHashChange = debounce(async () => {
      const url = readLoadFromParam();
      if (!url) {
        return;
      }
      await loadBufferFromRemote(url);
    }, 200);

    window.addEventListener('hashchange', onHashChange);

    const loadFromParam = readLoadFromParam();

    // Only set the value in the editor if an initial value hasn't been set yet
    if (!isInitialValueSet.current) {
      if (loadFromParam) {
        loadBufferFromRemote(loadFromParam);
      } else {
        // Only set to default input value if the localstorage value is undefined
        setValue(localStorageValue ?? DEFAULT_INPUT_VALUE);
      }
      isInitialValueSet.current = true;
    }

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [localStorageValue, setValue, toasts]);
};
