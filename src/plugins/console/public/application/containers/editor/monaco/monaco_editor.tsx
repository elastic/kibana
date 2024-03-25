/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { CONSOLE_LANG_ID } from '@kbn/monaco';
import { useEditorReadContext } from '../../../contexts';

export const MonacoEditor: FunctionComponent = () => {
  const { settings } = useEditorReadContext();

  const [value, setValue] = useState('GET /.kibana/_search');
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
