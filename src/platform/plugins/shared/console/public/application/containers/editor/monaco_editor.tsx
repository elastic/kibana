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
import { convertRequestToLanguage, StorageKeys } from '../../../services';
import {
  DEFAULT_LANGUAGE,
  AVAILABLE_LANGUAGES,
  KIBANA_API_PREFIX,
} from '../../../../common/constants';
import {
  useSetInitialValue,
  useSetupAutocompletePolling,
  useSetupAutosave,
  useResizeCheckerUtils,
  useKeyboardCommandsUtils,
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
    playButton: css`
      margin-left: ${euiTheme.size.xs} !important;
      height: ${euiTheme.size.xl} !important;
      width: ${euiTheme.size.xl} !important;
    `,
  };
};

export interface EditorProps {
  localStorageValue: string | undefined;
  value: string;
  setValue: (value: string) => void;
  customParsedRequestsProvider?: (model: any) => any;
}

const getLanguageLabelByValue = (value: string) => {
  return AVAILABLE_LANGUAGES.find((lang) => lang.value === value)?.label || DEFAULT_LANGUAGE;
};

export const MonacoEditor = ({
  localStorageValue,
  value,
  setValue,
  customParsedRequestsProvider,
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
  const [isPlayButtonHovered, setIsPlayButtonHovered] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState(
    storage.get(StorageKeys.DEFAULT_LANGUAGE, DEFAULT_LANGUAGE)
  );
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);
  const [isKbnRequestSelected, setIsKbnRequestSelected] = useState<boolean>(false);

  // When a Kibana request is selected, force language to curl
  useEffect(() => {
    if (isKbnRequestSelected) {
      setCurrentLanguage(DEFAULT_LANGUAGE);
    } else {
      setCurrentLanguage(defaultLanguage);
    }
  }, [defaultLanguage, isKbnRequestSelected]);

  const getRequestsCallback = useCallback(async (): Promise<EditorRequest[]> => {
    const requests = await actionsProvider.current?.getRequests();
    return requests ?? [];
  }, []);

  const getDocumenationLink = useCallback(async () => {
    return actionsProvider.current!.getDocumentationLink(docLinkVersion);
  }, [docLinkVersion]);

  const autoIndentCallback = useCallback(async () => {
    return actionsProvider.current!.autoIndent(context);
  }, [context]);

  const sendRequestsCallback = useCallback(async () => {
    await actionsProvider.current?.sendRequests(dispatch, context);
  }, [dispatch, context]);

  const isKbnRequestSelectedCallback = useCallback(async () => {
    return actionsProvider.current!.isKbnRequestSelected();
  }, []);

  const copyText = async (text: string) => {
    if (window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Could not copy to clipboard!');
  };

  // This function will convert all the selected requests to the language by
  // calling convertRequestToLanguage and then copy the data to clipboard.
  const copyAs = async (language?: string) => {
    // Get the language we want to convert the requests to
    const withLanguage = language || currentLanguage;
    // Get all the selected requests
    const requests = await getRequestsCallback();

    // If we have any kbn requests, we should not allow the user to copy as
    // anything other than curl
    const hasKbnRequests = requests.some((req) => req.url.startsWith(KIBANA_API_PREFIX));

    if (hasKbnRequests && withLanguage !== 'curl') {
      toasts.addDanger({
        title: i18n.translate('console.consoleMenu.copyAsMixedRequestsMessage', {
          defaultMessage: 'Kibana requests can only be copied as curl',
        }),
      });
      return;
    }

    const { data: requestsAsCode, error: requestError } = await convertRequestToLanguage({
      language: withLanguage,
      esHost: esHostService.getHost(),
      kibanaHost: window.location.origin,
      requests,
    });

    if (requestError) {
      toasts.addDanger({
        title: i18n.translate('console.consoleMenu.copyAsFailedMessage', {
          defaultMessage:
            '{requestsCount, plural, one {Request} other {Requests}} could not be copied to clipboard',
          values: { requestsCount: requests.length },
        }),
      });
      return;
    }

    toasts.addSuccess({
      title: i18n.translate('console.consoleMenu.copyAsSuccessMessage', {
        defaultMessage:
          '{requestsCount, plural, one {Request} other {Requests}} copied to clipboard as {language}',
        values: { language: getLanguageLabelByValue(withLanguage), requestsCount: requests.length },
      }),
    });

    await copyText(requestsAsCode);
  };

  const checkIsKbnRequestSelected = async () => {
    const isKbn = await isKbnRequestSelectedCallback();
    setIsKbnRequestSelected(isKbn || false);
    return isKbn;
  };

  const onCopyAsSubmit = async () => {
    // Check if current request is a Kibana request
    const isKbn = await checkIsKbnRequestSelected();
    // If it's a Kibana request, use curl; otherwise use the current language
    const languageToUse = isKbn ? DEFAULT_LANGUAGE : currentLanguage;
    await copyAs(languageToUse);
  };

  const handleLanguageChange = useCallback(
    (language: string) => {
      storage.set(StorageKeys.DEFAULT_LANGUAGE, language);
      setDefaultLanguage(language);
      if (!isKbnRequestSelected) {
        setCurrentLanguage(language);
      }
    },
    [storage, isKbnRequestSelected]
  );

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
              display={isPlayButtonHovered ? 'fill' : 'base'}
              size="m"
              color="primary"
              iconType="play"
              iconSize="m"
              onClick={sendRequestsCallback}
              onMouseEnter={() => setIsPlayButtonHovered(true)}
              onMouseLeave={() => setIsPlayButtonHovered(false)}
              data-test-subj="sendRequestButton"
              aria-label={i18n.translate('console.monaco.sendRequestButtonTooltipAriaLabel', {
                defaultMessage: 'Click to send request',
              })}
              css={styles.playButton}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('console.monaco.copyToLanguageButtonTooltipContent', {
              defaultMessage: 'Copy to language',
            })}
          >
            <EuiButtonIcon
              display="empty"
              size="m"
              color="text"
              iconType="copyClipboard"
              onClick={onCopyAsSubmit}
              data-test-subj="copyToLanguageActionButton"
              aria-label={i18n.translate('console.monaco.copyToLanguageButtonAriaLabel', {
                defaultMessage: 'Copy to language',
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
            onCopyAs={copyAs}
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
      />
    </div>
  );
};
