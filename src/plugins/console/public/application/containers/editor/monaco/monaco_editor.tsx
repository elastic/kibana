/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { CSSProperties, useCallback, useMemo, useRef, useState } from 'react';
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
import {
  useSetInitialValue,
  useSetupAutocompletePolling,
  useSetupAutosave,
  useResizeCheckerUtils,
} from './hooks';
import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';
import { getSuggestionProvider } from './monaco_editor_suggestion_provider';

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

  const divRef = useRef<HTMLDivElement | null>(null);
  const { setupResizeChecker, destroyResizeChecker } = useResizeCheckerUtils();

  const dispatch = useRequestActionContext();
  const actionsProvider = useRef<MonacoEditorActionsProvider | null>(null);
  const [editorActionsCss, setEditorActionsCss] = useState<CSSProperties>({});

  const editorDidMountCallback = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      actionsProvider.current = new MonacoEditorActionsProvider(editor, setEditorActionsCss);
      setupResizeChecker(divRef.current!, editor);
    },
    [setupResizeChecker]
  );

  const editorWillUnmountCallback = useCallback(() => {
    destroyResizeChecker();
  }, [destroyResizeChecker]);

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

  const suggestionProvider = useMemo(() => {
    return getSuggestionProvider(actionsProvider);
  }, []);
  const [value, setValue] = useState(initialTextValue);

  useSetInitialValue({ initialTextValue, setValue, toasts });

  useSetupAutocompletePolling({ autocompleteInfo, settingsService });

  useSetupAutosave({ value });

  return (
    <div
      css={css`
        width: 100%;
      `}
      ref={divRef}
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
        editorDidMount={editorDidMountCallback}
        editorWillUnmount={editorWillUnmountCallback}
        options={{
          fontSize: settings.fontSize,
          wordWrap: settings.wrapMode === true ? 'on' : 'off',
          theme: CONSOLE_THEME_ID,
        }}
        suggestionProvider={suggestionProvider}
      />
    </div>
  );
};
