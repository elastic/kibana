/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { CONSOLE_LANG_ID, CONSOLE_THEME_ID } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { ConsoleMenu } from '../../../components';
import {
  useServicesContext,
  useEditorReadContext,
  useRequestActionContext,
} from '../../../contexts';
import { useSetInitialValue } from './use_set_initial_value';
import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';

export interface EditorProps {
  initialTextValue: string;
}

export const MonacoEditor = ({ initialTextValue }: EditorProps) => {
  const {
    services: { notifications, esHostService, trackUiMetric, http },
  } = useServicesContext();
  const { toasts } = notifications;
  const { settings } = useEditorReadContext();
  const dispatch = useRequestActionContext();
  const actionsProvider = useRef<MonacoEditorActionsProvider | null>(null);

  const getCurl = useCallback(async (): Promise<string> => {
    return actionsProvider.current
      ? actionsProvider.current.getCurl(esHostService.getHost())
      : Promise.resolve('');
  }, [esHostService]);

  const sendRequests = useCallback(async () => {
    await actionsProvider.current?.sendRequests(toasts, dispatch, trackUiMetric, http);
  }, [dispatch, http, toasts, trackUiMetric]);
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
              onClick={sendRequests}
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
            getCurl={getCurl}
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
        editorDidMount={(editor) => {
          actionsProvider.current = new MonacoEditorActionsProvider(editor);
        }}
      />
    </div>
  );
};
