/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ESQLCallbacks, ESQLTelemetryCallbacks } from '@kbn/esql-types';
import {
  ESQLLang,
  ESQL_LANG_ID,
  type CodeEditorProps,
  type MonacoMessage,
  type monaco,
} from '@kbn/code-editor';
import type { EsqlLanguageDeps } from '../types';

// Module-level singleton: maps each Monaco model URI to its ES|QL language
// dependencies so the shared suggestion provider can resolve per-model callbacks.
// Returned from the hook so `editorDidMount` can register new models.
const esqlDepsByModelUri = new Map<string, EsqlLanguageDeps>();
const getModelDependencies = (model: monaco.editor.ITextModel) =>
  esqlDepsByModelUri.get(model.uri.toString());

// Single shared provider per language; resolves callbacks per Monaco model.
const sharedEsqlSuggestionProvider = ESQLLang.getSuggestionProvider?.({
  getModelDependencies,
});

// This provider depends on getEditorMessages, so it needs to be model URI specific
const sharedEsqlCodeActionProvider = ESQLLang.getCodeActionProvider?.({
  getModelDependencies,
});

interface UseEditorConfigParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
  editorModelUriRef: React.MutableRefObject<string | undefined>;
  editorCommandDisposables: React.MutableRefObject<
    WeakMap<monaco.editor.IStandaloneCodeEditor, monaco.IDisposable[]>
  >;
  esqlCallbacks: ESQLCallbacks;
  telemetryCallbacks: ESQLTelemetryCallbacks;
  isDisabled: boolean | undefined;
  measuredEditorWidth: number;
  setMeasuredEditorWidth: (width: number) => void;
  resetPendingTracking: () => void;
  editorMessagesRef: React.MutableRefObject<{
    errors: MonacoMessage[];
    warnings: MonacoMessage[];
  }>;
}

export const useEditorConfig = ({
  editorRef,
  editorModel,
  editorModelUriRef,
  editorCommandDisposables,
  esqlCallbacks,
  telemetryCallbacks,
  isDisabled,
  measuredEditorWidth,
  setMeasuredEditorWidth,
  resetPendingTracking,
  editorMessagesRef,
}: UseEditorConfigParams) => {
  const suggestionProvider = sharedEsqlSuggestionProvider;
  const codeActionsProvider = sharedEsqlCodeActionProvider;

  useEffect(() => {
    const modelUri = editorModelUriRef.current;
    if (modelUri) {
      esqlDepsByModelUri.set(modelUri, {
        ...esqlCallbacks,
        telemetry: telemetryCallbacks,
        getEditorMessages: () => editorMessagesRef.current,
      });
    }
  }, [esqlCallbacks, telemetryCallbacks, editorModelUriRef, editorMessagesRef]);

  const hoverProvider = useMemo(
    () =>
      ESQLLang.getHoverProvider?.({
        ...esqlCallbacks,
        telemetry: telemetryCallbacks,
      }),
    [esqlCallbacks, telemetryCallbacks]
  );

  const signatureProvider = useMemo(() => {
    return ESQLLang.getSignatureProvider?.(esqlCallbacks);
  }, [esqlCallbacks]);

  const inlineCompletionsProvider = useMemo(() => {
    return ESQLLang.getInlineCompletionsProvider?.(esqlCallbacks);
  }, [esqlCallbacks]);

  const documentHighlightProvider = useMemo(() => ESQLLang.getDocumentHighlightProvider?.(), []);

  const codeEditorHoverProvider = useMemo(
    () => ({
      provideHover: (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        token: monaco.CancellationToken
      ) => hoverProvider?.provideHover?.(model, position, token) ?? { contents: [] },
    }),
    [hoverProvider]
  );

  const onErrorClick = useCallback(
    ({ startLineNumber, startColumn }: MonacoMessage) => {
      if (!editorRef.current) {
        return;
      }

      editorRef.current.focus();
      editorRef.current.setPosition({
        lineNumber: startLineNumber,
        column: startColumn,
      });
      editorRef.current.revealLine(startLineNumber);
    },
    [editorRef]
  );

  // Clean up the monaco editor and DOM on unmount
  useEffect(() => {
    const disposablesMap = editorCommandDisposables.current;
    const modelUriRef = editorModelUriRef;
    const edRef = editorRef;
    const edModel = editorModel;
    return () => {
      const modelUri = modelUriRef.current;
      if (modelUri) {
        esqlDepsByModelUri.delete(modelUri);
      }
      // Cleanup editor command disposables
      const currentEditor = edRef.current;
      if (currentEditor) {
        const disposables = disposablesMap.get(currentEditor);
        if (disposables) {
          disposables.forEach((disposable) => {
            disposable.dispose();
          });
          disposablesMap.delete(currentEditor);
        }
      }

      resetPendingTracking();

      edModel.current?.dispose();
      edRef.current?.dispose();
      edModel.current = undefined;
      edRef.current = undefined;
    };
  }, [resetPendingTracking, editorCommandDisposables, editorRef, editorModel, editorModelUriRef]);

  // When the layout changes, and the editor is not focused, we want to
  // recalculate the visible code so it fills up the available space. We
  // use a ref because editorDidMount is only called once, and the reference
  // to the state becomes stale after re-renders.
  const onLayoutChange = (layoutInfoEvent: monaco.editor.EditorLayoutInfo) => {
    if (layoutInfoEvent.width !== measuredEditorWidth) {
      setMeasuredEditorWidth(layoutInfoEvent.width);
    }
  };

  const onLayoutChangeRef = useRef(onLayoutChange);
  onLayoutChangeRef.current = onLayoutChange;

  const codeEditorOptions: CodeEditorProps['options'] = useMemo(
    () => ({
      hover: {
        above: true,
      },
      parameterHints: {
        enabled: true,
        cycle: true,
      },
      accessibilitySupport: 'auto',
      autoIndent: 'keep',
      automaticLayout: true,
      fixedOverflowWidgets: true,
      folding: false,
      fontSize: 14,
      hideCursorInOverviewRuler: true,
      lightbulb: {
        enabled: false,
      },
      lineDecorationsWidth: 20,
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      padding: {
        top: 8,
        bottom: 8,
      },
      quickSuggestions: false,
      inlineSuggest: {
        enabled: true,
        showToolbar: 'onHover',
        suppressSuggestions: false,
        keepOnBlur: false,
      },
      readOnly: isDisabled,
      renderLineHighlight: 'line',
      renderLineHighlightOnlyWhenFocus: true,
      lineHeight: 22,
      scrollbar: {
        horizontal: 'hidden',
        horizontalScrollbarSize: 6,
        vertical: 'auto',
        verticalScrollbarSize: 6,
      },
      scrollBeyondLastLine: false,
      tabSize: 2,
      theme: ESQL_LANG_ID,
      wordWrap: 'on',
      wrappingIndent: 'none',
    }),
    [isDisabled]
  );

  return {
    esqlDepsByModelUri,
    suggestionProvider,
    codeActionsProvider,
    codeEditorHoverProvider,
    signatureProvider,
    inlineCompletionsProvider,
    documentHighlightProvider,
    onErrorClick,
    codeEditorOptions,
    onLayoutChangeRef,
  };
};
