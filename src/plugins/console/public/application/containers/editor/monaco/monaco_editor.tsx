/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { CONSOLE_LANG_ID, CONSOLE_THEME_ID, monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { ConsoleMenu } from '../../../components';
import {
  useServicesContext,
  useEditorReadContext,
  useRequestActionContext,
} from '../../../contexts';
import { useSetInitialValue } from './use_set_initial_value';
import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';
import { useSetupAutocompletePolling } from './use_setup_autocomplete_polling';
import { useSetupAutosave } from './use_setup_autosave';

export interface EditorProps {
  initialTextValue: string;
}

export const MonacoEditor = ({ initialTextValue }: EditorProps) => {
  const {
    services: {
      notifications,
      esHostService,
      trackUiMetric,
      http,
      settings: settingsService,
      autocompleteInfo,
    },
    docLinkVersion,
  } = useServicesContext();
  const { toasts } = notifications;
  const { settings } = useEditorReadContext();
  const dispatch = useRequestActionContext();
  const actionsProvider = useRef<MonacoEditorActionsProvider | null>(null);
  const [editorActionsCss, setEditorActionsCss] = useState<CSSProperties>({});

  const editorDidMountCallback = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    actionsProvider.current = new MonacoEditorActionsProvider(editor, setEditorActionsCss);
  }, []);

  const getCurlCallback = useCallback(async (): Promise<string> => {
    const curl = await actionsProvider.current?.getCurl(esHostService.getHost());
    return curl ?? '';
  }, [esHostService]);

  const getDocumenationLink = useCallback(async () => {
    return actionsProvider.current!.getDocumentationLink(docLinkVersion);
  }, [docLinkVersion]);

  const sendRequestsCallback = useCallback(async () => {
    await actionsProvider.current?.sendRequests(toasts, dispatch, trackUiMetric, http);
  }, [dispatch, http, toasts, trackUiMetric]);

  const [value, setValue] = useState(initialTextValue);

  const setInitialValue = useSetInitialValue;

  useEffect(() => {
    setInitialValue({ initialTextValue, setValue, toasts });
  }, [initialTextValue, setInitialValue, toasts]);

  useSetupAutocompletePolling({ autocompleteInfo, settingsService });

  useSetupAutosave({ value });

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
        style={editorActionsCss}
      >
        <EuiFlexItem>
          <EuiToolTip
            content={i18n.translate('console.sendRequestButtonTooltip', {
              defaultMessage: 'Click to send request',
            })}
          >
            <EuiLink
              color="primary"
              onClick={sendRequestsCallback}
              data-test-subj="sendRequestButton"
              aria-label={i18n.translate('console.sendRequestButtonTooltip', {
                defaultMessage: 'Click to send request',
              })}
            >
              <EuiIcon type="play" />
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <ConsoleMenu
            getCurl={getCurlCallback}
            getDocumentation={getDocumenationLink}
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
        editorDidMount={editorDidMountCallback}
      />
    </div>
  );
};
