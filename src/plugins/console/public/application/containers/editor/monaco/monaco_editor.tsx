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
import { CONSOLE_LANG_ID, CONSOLE_THEME_ID } from '@kbn/monaco';
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

  const [value, setValue] = useState(initialTextValue);

  const setInitialValue = useSetInitialValue({ initialTextValue, setValue, toasts });

  useEffect(() => {
    setInitialValue();
  }, [setInitialValue]);

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
          theme: CONSOLE_THEME_ID,
        }}
      />
    </div>
  );
};
