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
import { useLoadBufferFromRemote } from './use_load_buffer_from_remote';
import { useServicesContext, useEditorReadContext } from '../../../contexts';
import { DEFAULT_INPUT_VALUE } from '../../../../../common/constants';

export interface EditorProps {
  initialTextValue: string;
}

interface QueryParams {
  load_from: string;
}

export const MonacoEditor = ({ initialTextValue }: EditorProps) => {
  const {
    services: { notifications },
  } = useServicesContext();
  const { settings } = useEditorReadContext();

  const [value, setValue] = useState(initialTextValue);

  const loadBufferFromRemote = useLoadBufferFromRemote({
    initialTextValue,
    setValue,
    notifications,
  });

  useEffect(() => {
    const readQueryParams = () => {
      const [, queryString] = (window.location.hash || window.location.search || '').split('?');

      return parse(queryString || '', { sort: false }) as Required<QueryParams>;
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
  }, [notifications.toasts, initialTextValue, loadBufferFromRemote]);

  return (
    <div
      css={css`
        width: 100%;
      `}
    >
      <CodeEditor
        languageId={CONSOLE_LANG_ID}
        value={value}
        onChange={setValue}
        fullWidth={true}
        accessibilityOverlayEnabled={settings.isAccessibilityOverlayEnabled}
        options={{
          fontSize: settings.fontSize,
          wordWrap: settings.wrapMode === true ? 'on' : 'off',
        }}
      />
    </div>
  );
};
