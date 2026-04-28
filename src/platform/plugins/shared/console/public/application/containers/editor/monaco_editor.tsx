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
import type { ESQLCallbacks } from '@kbn/esql-types';
import { CodeEditor } from '@kbn/code-editor/code_editor';
import type { monaco } from '@kbn/monaco';
import { CONSOLE_LANG_ID, CONSOLE_THEME_ID, ConsoleLang } from '@kbn/monaco';

import { i18n } from '@kbn/i18n';
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';
import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';
import type { EditorRequest, InputEditorValue } from './types';
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
      padding-left: ${euiTheme.size.xs};
      padding-right: ${euiTheme.size.xs};

      // For IE11
      min-width: calc(${euiTheme.size.l} * 2);
    `,
  };
};

export interface EditorProps {
  localStorageValue: string | undefined;
  activeTabId?: string;
  value: InputEditorValue;
  setValue: (value: InputEditorValue) => void;
  customParsedRequestsProvider?: (model: any) => any;
  enableAutosave?: boolean;
  skipInitialValue?: boolean;
  allowDefaultValueWhenEmpty?: boolean;
}

export const MonacoEditor = ({
  localStorageValue,
  activeTabId,
  value,
  setValue,
  customParsedRequestsProvider,
  enableAutosave = true,
  skipInitialValue = false,
  allowDefaultValueWhenEmpty,
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
  const latestValueRef = useRef<InputEditorValue>(value);
  const isRestoringViewStateRef = useRef(false);
  const viewStateRafIdRef = useRef<number | null>(null);
  const viewStateDirtyRef = useRef(false);
  const restoreSequenceRef = useRef(0);

  // Keep this ref in sync during render to avoid races where the CodeEditor
  // emits onChange due to a controlled value update (e.g. tab switch) before
  // an effect can update the ref.
  latestValueRef.current = value;

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

  useEffect(() => {
    if (!editorInstance) return;
    const scheduleSaveViewState = () => {
      if (isRestoringViewStateRef.current) return;
      viewStateDirtyRef.current = true;
      if (viewStateRafIdRef.current !== null) return;

      viewStateRafIdRef.current = window.requestAnimationFrame(() => {
        viewStateRafIdRef.current = null;
        if (!viewStateDirtyRef.current) return;
        viewStateDirtyRef.current = false;

        const current = latestValueRef.current;
        setValue({ ...current, viewState: editorInstance.saveViewState() });
      });
    };

    const subscriptions = [
      editorInstance.onDidChangeCursorPosition(scheduleSaveViewState),
      editorInstance.onDidChangeCursorSelection(scheduleSaveViewState),
      editorInstance.onDidScrollChange(scheduleSaveViewState),
    ];

    return () => {
      for (const sub of subscriptions) sub.dispose();
      if (viewStateRafIdRef.current !== null) {
        window.cancelAnimationFrame(viewStateRafIdRef.current);
        viewStateRafIdRef.current = null;
      }
    };
  }, [editorInstance, setValue]);

  useEffect(() => {
    if (!editorInstance) return;
    if (!activeTabId) return;
    const targetText = latestValueRef.current.text;
    const targetViewState = latestValueRef.current.viewState ?? null;

    let isCancelled = false;
    const restoreSequence = ++restoreSequenceRef.current;
    let attempts = 0;
    const maxAttempts = 30;
    let contentSizeSubscription: { dispose: () => void } | undefined;
    let fallbackRaf1: number | undefined;
    let fallbackRaf2: number | undefined;

    const tryRestoreAfterTextApplied = () => {
      if (isCancelled) return;
      if (restoreSequenceRef.current !== restoreSequence) return;

      const model = editorInstance.getModel();
      if (!model) return;

      attempts += 1;

      // Only restore view state after the newly selected tab's text
      // has been applied to Monaco's model.
      if (model.getValue() !== targetText && attempts < maxAttempts) {
        window.requestAnimationFrame(tryRestoreAfterTextApplied);
        return;
      }

      const applyViewState = () => {
        if (isCancelled) return;
        if (restoreSequenceRef.current !== restoreSequence) return;

        isRestoringViewStateRef.current = true;
        editorInstance.layout();
        editorInstance.restoreViewState(targetViewState);
        editorInstance.focus();

        window.requestAnimationFrame(() => {
          if (isCancelled) return;
          if (restoreSequenceRef.current !== restoreSequence) return;
          editorInstance.restoreViewState(targetViewState);
          editorInstance.focus();
          isRestoringViewStateRef.current = false;
        });
      };

      contentSizeSubscription?.dispose();
      contentSizeSubscription = editorInstance.onDidContentSizeChange(() => {
        contentSizeSubscription?.dispose();
        contentSizeSubscription = undefined;
        window.requestAnimationFrame(applyViewState);
      });

      // Fallback: apply after 2 frames even if no content size event arrives.
      fallbackRaf1 = window.requestAnimationFrame(() => {
        fallbackRaf2 = window.requestAnimationFrame(() => {
          contentSizeSubscription?.dispose();
          contentSizeSubscription = undefined;
          applyViewState();
        });
      });
    };

    window.requestAnimationFrame(tryRestoreAfterTextApplied);

    return () => {
      isCancelled = true;
      isRestoringViewStateRef.current = false;
      contentSizeSubscription?.dispose();
      if (fallbackRaf1 !== undefined) window.cancelAnimationFrame(fallbackRaf1);
      if (fallbackRaf2 !== undefined) window.cancelAnimationFrame(fallbackRaf2);
    };
    // Intentionally only restore view state on tab switches.
  }, [editorInstance, activeTabId]);

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
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) => {
        const columns = await getEsqlColumns({
          esqlQuery: query,
          search: data?.search?.search,
        });
        return columns;
      },
    };
    return callbacks;
  }, [licensing, application, http, data?.search?.search]);

  const suggestionProvider = useMemo(
    () => ConsoleLang.getSuggestionProvider?.(esqlCallbacks, actionsProvider),
    [esqlCallbacks]
  );

  useSetInitialValue({
    localStorageValue,
    currentValueText: value.text,
    skipInitialValue,
    allowDefaultValueWhenEmpty,
    setValue,
    toasts,
  });

  useSetupAutocompletePolling({ autocompleteInfo, settingsService });

  useSetupAutosave({ value: value.text, enabled: enableAutosave });

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
              iconType="play"
              onClick={sendRequestsCallback}
              data-test-subj="sendRequestButton"
              aria-label={i18n.translate('console.monaco.sendRequestButtonTooltipAriaLabel', {
                defaultMessage: 'Click to send request',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ContextMenu
            getRequests={getRequestsCallback}
            getDocumentation={getDocumenationLink}
            autoIndent={autoIndentCallback}
            notifications={notifications}
            getIsKbnRequestSelected={isKbnRequestSelectedCallback}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <CodeEditor
        dataTestSubj={'consoleMonacoEditor'}
        languageId={CONSOLE_LANG_ID}
        value={value.text}
        onChange={(nextText) => {
          if (value.text === nextText) return;
          setValue({ ...latestValueRef.current, text: nextText });
        }}
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
