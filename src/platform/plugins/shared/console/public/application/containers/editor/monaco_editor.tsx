/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties } from 'react';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { CodeEditor } from '@kbn/code-editor/code_editor';
import type { ESQLCallbacks, monaco } from '@kbn/monaco';
import { CONSOLE_LANG_ID, CONSOLE_THEME_ID, ConsoleLang } from '@kbn/monaco';

import { i18n } from '@kbn/i18n';
import { getESQLSources } from '@kbn/esql-editor/src/helpers';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { FieldType } from '@kbn/esql-ast/src/definitions/types';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';
import type { EditorRequest } from './types';
import { DEFAULT_LANGUAGE, AVAILABLE_LANGUAGES } from '../../../../common/constants';
import {
  useSetInitialValue,
  useSetupAutocompletePolling,
  useSetupAutosave,
  useResizeCheckerUtils,
  useKeyboardCommandsUtils,
  useCopyToLanguage,
} from './hooks';
import {
  useServicesContext,
  useEditorReadContext,
  useRequestActionContext,
  useEditorActionContext,
} from '../../contexts';
import { ContextMenu } from './components';
import { useSetInputEditor } from '../../hooks';
import { useActionStyles, useHighlightedLinesClassName } from './styles';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { actions } = useActionStyles();

  return {
    editorActions: css`
      ${actions}

      // For IE11
      min-width: calc(${euiTheme.size.l} * 2);
    `,
  };
};

export interface EditorProps {
  localStorageValue: string | undefined;
  value: string;
  setValue: (value: string) => void;
  customParsedRequestsProvider?: (model: any) => any;
  enableSuggestWidgetRepositioning: boolean;
}

const getLanguageLabelByValue = (value: string) => {
  return AVAILABLE_LANGUAGES.find((lang) => lang.value === value)?.label || DEFAULT_LANGUAGE;
};

export const MonacoEditor = ({
  localStorageValue,
  value,
  setValue,
  customParsedRequestsProvider,
  enableSuggestWidgetRepositioning,
}: EditorProps) => {
  const context = useServicesContext();
  const {
    services: {
      http,
      notifications,
      settings: settingsService,
      autocompleteInfo,
      data,
      licensing,
      application,
      storage,
      esHostService,
    },
    docLinkVersion,
  } = context;
  const { toasts } = notifications;
  const {
    settings,
    restoreRequestFromHistory: requestToRestoreFromHistory,
    fileToImport,
  } = useEditorReadContext();
  const [editorInstance, setEditorInstace] = useState<
    monaco.editor.IStandaloneCodeEditor | undefined
  >();
  const divRef = useRef<HTMLDivElement | null>(null);
  const { setupResizeChecker, destroyResizeChecker } = useResizeCheckerUtils();
  const { registerKeyboardCommands, unregisterKeyboardCommands } = useKeyboardCommandsUtils();

  const dispatch = useRequestActionContext();
  const editorDispatch = useEditorActionContext();
  const actionsProvider = useRef<MonacoEditorActionsProvider | null>(null);
  const [editorActionsCss, setEditorActionsCss] = useState<CSSProperties>({});

  const setInputEditor = useSetInputEditor();
  const styles = useStyles();
  const highlightedLinesClassName = useHighlightedLinesClassName();

  const getRequestsCallback = useCallback(async (): Promise<EditorRequest[]> => {
    const requests = await actionsProvider.current?.getRequests();
    return requests ?? [];
  }, []);

  const isKbnRequestSelectedCallback = useCallback(async () => {
    return actionsProvider.current!.isKbnRequestSelected();
  }, []);

  // Use the custom hook for copy and language management
  const {
    currentLanguage,
    isKbnRequestSelected,
    checkIsKbnRequestSelected,
    onCopyToLanguageSubmit,
    copyToLanguage,
    handleLanguageChange,
  } = useCopyToLanguage({
    storage,
    esHostService,
    toasts,
    getRequestsCallback,
    isKbnRequestSelectedCallback,
  });

  const getDocumenationLink = useCallback(async () => {
    return actionsProvider.current!.getDocumentationLink(docLinkVersion);
  }, [docLinkVersion]);

  const autoIndentCallback = useCallback(async () => {
    return actionsProvider.current!.autoIndent(context);
  }, [context]);

  const sendRequestsCallback = useCallback(async () => {
    await actionsProvider.current?.sendRequests(dispatch, context);
  }, [dispatch, context]);

  const editorDidMountCallback = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      // Create custom provider if factory function is provided
      const customProvider = customParsedRequestsProvider
        ? customParsedRequestsProvider(editor.getModel())
        : undefined;

      const provider = new MonacoEditorActionsProvider(
        editor,
        setEditorActionsCss,
        highlightedLinesClassName,
        customProvider
      );
      setInputEditor(provider);
      actionsProvider.current = provider;
      setupResizeChecker(divRef.current!, editor);
      setEditorInstace(editor);
    },
    [
      setupResizeChecker,
      setInputEditor,
      setEditorInstace,
      customParsedRequestsProvider,
      highlightedLinesClassName,
    ]
  );

  useEffect(() => {
    if (settings.isKeyboardShortcutsEnabled && editorInstance) {
      registerKeyboardCommands({
        editor: editorInstance,
        sendRequest: sendRequestsCallback,
        autoIndent: async () => await actionsProvider.current?.autoIndent(context),
        getDocumentationLink: getDocumenationLink,
        moveToPreviousRequestEdge: async () =>
          await actionsProvider.current?.moveToPreviousRequestEdge(),
        moveToNextRequestEdge: async () => await actionsProvider.current?.moveToNextRequestEdge(),
      });
    } else {
      unregisterKeyboardCommands();
    }
  }, [
    editorInstance,
    getDocumenationLink,
    sendRequestsCallback,
    registerKeyboardCommands,
    unregisterKeyboardCommands,
    settings.isKeyboardShortcutsEnabled,
    context,
  ]);

  const editorWillUnmountCallback = useCallback(() => {
    destroyResizeChecker();
    unregisterKeyboardCommands();
  }, [destroyResizeChecker, unregisterKeyboardCommands]);

  const esqlCallbacks: ESQLCallbacks = useMemo(() => {
    const callbacks: ESQLCallbacks = {
      getSources: async () => {
        const getLicense = licensing?.getLicense;
        return await getESQLSources({ application, http }, getLicense);
      },
      getColumnsFor: async ({ query: queryToExecute }: { query?: string } | undefined = {}) => {
        if (queryToExecute) {
          try {
            const columns = await getESQLQueryColumns({
              esqlQuery: queryToExecute,
              search: data?.search?.search,
            });
            return (
              columns?.map((c) => {
                return {
                  name: c.name,
                  type: c.meta.esType as FieldType,
                  hasConflict: c.meta.type === KBN_FIELD_TYPES.CONFLICT,
                  userDefined: false,
                };
              }) || []
            );
          } catch (error) {
            // Handle error
            return [];
          }
        }
        return [];
      },
    };
    return callbacks;
  }, [licensing, application, http, data?.search?.search]);

  const suggestionProvider = useMemo(
    () => ConsoleLang.getSuggestionProvider?.(esqlCallbacks, actionsProvider),
    [esqlCallbacks]
  );

  useSetInitialValue({ localStorageValue, setValue, toasts });

  useSetupAutocompletePolling({ autocompleteInfo, settingsService });

  useSetupAutosave({ value });

  // Restore the request from history if there is one
  const updateEditor = useCallback(async () => {
    if (requestToRestoreFromHistory) {
      editorDispatch({ type: 'clearRequestToRestore' });
      await actionsProvider.current?.appendRequestToEditor(
        requestToRestoreFromHistory,
        dispatch,
        context
      );
    }

    // Import a request file if one is provided
    if (fileToImport) {
      editorDispatch({ type: 'setFileToImport', payload: null });
      await actionsProvider.current?.importRequestsToEditor(fileToImport);
    }
  }, [fileToImport, requestToRestoreFromHistory, dispatch, context, editorDispatch]);

  useEffect(() => {
    updateEditor();
  }, [updateEditor]);

  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
      `}
      ref={divRef}
      data-test-subj="consoleMonacoEditorContainer"
    >
      <EuiFlexGroup
        css={styles.editorActions}
        id="ConAppEditorActions"
        gutterSize="xs"
        responsive={false}
        style={editorActionsCss}
        justifyContent="center"
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('console.monaco.sendRequestButtonTooltipContent', {
              defaultMessage: 'Click to send request',
            })}
          >
            <EuiButtonIcon
              display="fill"
              color="primary"
              iconType="play"
              iconSize="m"
              onClick={sendRequestsCallback}
              data-test-subj="sendRequestButton"
              aria-label={i18n.translate('console.monaco.sendRequestButtonTooltipAriaLabel', {
                defaultMessage: 'Click to send request',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('console.monaco.copyToLanguageButtonTooltipContent', {
              defaultMessage: 'Copy to {language}',
              values: {
                language: getLanguageLabelByValue(
                  isKbnRequestSelected ? DEFAULT_LANGUAGE : currentLanguage
                ),
              },
            })}
          >
            <EuiButtonIcon
              display="empty"
              color="text"
              iconType="copyClipboard"
              iconSize="m"
              onClick={onCopyToLanguageSubmit}
              onMouseEnter={checkIsKbnRequestSelected}
              onFocus={checkIsKbnRequestSelected}
              data-test-subj="copyToLanguageActionButton"
              aria-label={i18n.translate('console.monaco.copyToLanguageButtonAriaLabel', {
                defaultMessage: 'Copy to {language}',
                values: {
                  language: getLanguageLabelByValue(
                    isKbnRequestSelected ? DEFAULT_LANGUAGE : currentLanguage
                  ),
                },
              })}
              disabled={!window.navigator?.clipboard}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ContextMenu
            getDocumentation={getDocumenationLink}
            autoIndent={autoIndentCallback}
            notifications={notifications}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            isKbnRequestSelected={isKbnRequestSelected}
            onMenuOpen={checkIsKbnRequestSelected}
            onCopyAs={copyToLanguage}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <CodeEditor
        dataTestSubj={'consoleMonacoEditor'}
        languageId={CONSOLE_LANG_ID}
        value={value}
        onChange={setValue}
        fullWidth={true}
        accessibilityOverlayEnabled={settings.isAccessibilityOverlayEnabled}
        editorDidMount={editorDidMountCallback}
        editorWillUnmount={editorWillUnmountCallback}
        links={true}
        options={{
          fontSize: settings.fontSize,
          wordWrap: settings.wrapMode === true ? 'on' : 'off',
          theme: CONSOLE_THEME_ID,
          // Force the hover views to always render below the cursor to avoid clipping
          // when the cursor is near the top of the editor.
          hover: {
            above: false,
          },
        }}
        suggestionProvider={suggestionProvider}
        enableFindAction={true}
        enableCustomContextMenu={true}
        enableSuggestWidgetRepositioning={enableSuggestWidgetRepositioning}
      />
    </div>
  );
};
