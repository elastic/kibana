/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { CONSOLE_LANG_ID, CONSOLE_THEME_ID, monaco } from '@kbn/monaco';
import { ResizeChecker } from '@kbn/kibana-utils-plugin/public';
import { useSetInitialValue } from './use_set_initial_value';
import { useServicesContext, useEditorReadContext } from '../../../contexts';

export interface EditorProps {
  initialTextValue: string;
}

export const MonacoEditor = ({ initialTextValue }: EditorProps) => {
  const {
    services: {
      notifications: { toasts },
    },
  } = useServicesContext();
  const { settings } = useEditorReadContext();
  const divRef = useRef<HTMLDivElement | null>(null);
  const resizeChecker = useRef<ResizeChecker | null>(null);

  const editorDidMountCallback = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    resizeChecker.current = new ResizeChecker(divRef.current!);
    resizeChecker.current.on('resize', () => {
      editor.layout();
    });
  }, []);

  const editorWillUnmountCallback = useCallback(() => {
    resizeChecker.current!.destroy();
  }, []);

  const [value, setValue] = useState(initialTextValue);

  const setInitialValue = useSetInitialValue;

  useEffect(() => {
    setInitialValue({ initialTextValue, setValue, toasts });
  }, [initialTextValue, setInitialValue, toasts]);

  return (
    <div
      css={css`
        width: 100%;
      `}
      ref={divRef}
    >
      <CodeEditor
        languageId={CONSOLE_LANG_ID}
        value={value}
        onChange={setValue}
        fullWidth={true}
        accessibilityOverlayEnabled={settings.isAccessibilityOverlayEnabled}
        editorDidMount={editorDidMountCallback}
        editorWillUnmount={editorWillUnmountCallback}
        options={{
          fontSize: settings.fontSize,
          wordWrap: settings.wrapMode === true ? 'on' : 'off',
          theme: CONSOLE_THEME_ID,
        }}
      />
    </div>
  );
};
