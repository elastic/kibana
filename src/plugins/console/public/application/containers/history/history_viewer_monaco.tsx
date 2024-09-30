/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef } from 'react';
import { css } from '@emotion/react';
import { CONSOLE_LANG_ID, CONSOLE_THEME_ID, monaco } from '@kbn/monaco';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { formatRequestBodyDoc } from '../../../lib/utils';
import { DevToolsSettings } from '../../../services';
import { useResizeCheckerUtils } from '../editor/hooks';

export const HistoryViewer = ({
  settings,
  req,
}: {
  settings: DevToolsSettings;
  req: { method: string; endpoint: string; data: string; time: string } | null;
}) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const { setupResizeChecker, destroyResizeChecker } = useResizeCheckerUtils();

  const editorDidMountCallback = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      setupResizeChecker(divRef.current!, editor);
    },
    [setupResizeChecker]
  );

  const editorWillUnmountCallback = useCallback(() => {
    destroyResizeChecker();
  }, [destroyResizeChecker]);
  let renderedHistoryRequest: string;
  if (req) {
    const indent = true;
    const formattedData = req.data ? formatRequestBodyDoc([req.data], indent).data : '';
    renderedHistoryRequest = req.method + ' ' + req.endpoint + '\n' + formattedData;
  } else {
    renderedHistoryRequest = i18n.translate('console.historyPage.monaco.noHistoryTextMessage', {
      defaultMessage: '# No history available to display',
    });
  }
  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
      `}
      ref={divRef}
    >
      <CodeEditor
        languageId={CONSOLE_LANG_ID}
        value={renderedHistoryRequest}
        fullWidth={true}
        editorDidMount={editorDidMountCallback}
        editorWillUnmount={editorWillUnmountCallback}
        options={{
          readOnly: true,
          fontSize: settings.fontSize,
          wordWrap: settings.wrapMode ? 'on' : 'off',
          theme: CONSOLE_THEME_ID,
          automaticLayout: true,
        }}
      />
    </div>
  );
};
