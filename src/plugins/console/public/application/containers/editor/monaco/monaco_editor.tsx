/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { CONSOLE_LANG_ID } from '@kbn/monaco';
import { parse } from 'query-string';
import { debounce } from 'lodash';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { i18n } from '@kbn/i18n';
import { useServicesContext } from '../../../contexts';

export interface EditorProps {
  initialTextValue: string;
}

interface QueryParams {
  load_from: string;
}

const DEFAULT_INPUT_VALUE = `# Click the Variables button, above, to create your own variables.
GET \${exampleVariable1} // _search
{
  "query": {
    "\${exampleVariable2}": {} // match_all
  }
}`;

export const MonacoEditor = ({ initialTextValue }: EditorProps) => {
  const {
    services: {
      history,
      notifications,
      settings: settingsService,
      http,
      autocompleteInfo,
      storage,
    },
  } = useServicesContext();
  const [value, setValue] = useState(initialTextValue);

  useEffect(() => {
    const readQueryParams = () => {
      const [, queryString] = (window.location.hash || window.location.search || '').split('?');

      return parse(queryString || '', { sort: false }) as Required<QueryParams>;
    };

    const loadBufferFromRemote = (url: string) => {
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

        if (/https?:\/\/api\.github\.com/.test(url)) {
          loadFrom.headers = { Accept: 'application/vnd.github.v3.raw' };
        }
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

    // Support for loading a console snippet from a remote source, like support docs.
    const onHashChange = debounce(() => {
      const { load_from: url } = readQueryParams();
      if (!url) {
        return;
      }
      loadBufferFromRemote(url);
    }, 200);
    window.addEventListener('hashchange', onHashChange);

    const initialQueryParams = readQueryParams();

    if (initialQueryParams.load_from) {
      loadBufferFromRemote(initialQueryParams.load_from);
    } else {
      setValue(initialTextValue || DEFAULT_INPUT_VALUE);
    }

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [
    notifications.toasts,
    initialTextValue,
    history,
    settingsService,
    http,
    autocompleteInfo,
    storage,
  ]);

  return (
    <div
      css={css`
        width: 100%;
      `}
    >
      <CodeEditor languageId={CONSOLE_LANG_ID} value={value} onChange={setValue} fullWidth={true} />
    </div>
  );
};
