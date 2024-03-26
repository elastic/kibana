/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { CONSOLE_LANG_ID, CONSOLE_THEME_ID } from '@kbn/monaco';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MonacoSenseEditor, initSenseEditor } from '../../../models/monaco_sense_editor';
import { useSetInitialValue } from './use_set_initial_value';
import { useServicesContext, useEditorReadContext } from '../../../contexts';
import { ConsoleMenu } from '../../../components';

export interface EditorProps {
  initialTextValue: string;
}

export const MonacoEditor = ({ initialTextValue }: EditorProps) => {
  const {
    services: { notifications, esHostService },
  } = useServicesContext();
  const { toasts } = notifications;
  const { settings } = useEditorReadContext();
  const editorInstanceRef = useRef<MonacoSenseEditor | null>(null);

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
      <EuiFlexGroup
        className="conApp__editorActions"
        id="ConAppEditorActions"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiToolTip
            content={i18n.translate('console.sendRequestButtonTooltip', {
              defaultMessage: 'Click to send request',
            })}
          >
            <EuiLink
              color="success"
              onClick={() => {}}
              data-test-subj="sendRequestButton"
              aria-label={i18n.translate('console.sendRequestButtonTooltip', {
                defaultMessage: 'Click to send request',
              })}
            >
              <EuiIcon type="playFilled" />
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <ConsoleMenu
            getCurl={() => {
              return editorInstanceRef.current!.getRequestsAsCURL(esHostService.getHost());
            }}
            getDocumentation={() => {
              return Promise.resolve(null);
            }}
            autoIndent={() => {}}
            notifications={notifications}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
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
        editorDidMount={async (editor) => {
          editorInstanceRef.current = await initSenseEditor(editor);
        }}
      />
    </div>
  );
};
