/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { EuiFormRow, EuiPanel } from '@elastic/eui';
import { Controller, type Control, type FieldPath, type FieldError } from 'react-hook-form';
import { CodeEditor } from '@kbn/code-editor';
import { ESQL_LANG_ID, type monaco } from '@kbn/monaco';
import { suggest } from '@kbn/esql-language';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { FormValues } from '../types';

// Visible prefix in the editor (non-deletable)
const WHERE_PREFIX = 'WHERE ';
// Full prefix for autocomplete context
const AUTOCOMPLETE_PREFIX = 'FROM dummy | WHERE ';

interface WhereClauseEditorProps {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  label?: string;
  helpText?: string;
  /** ES|QL callbacks for field/source suggestions */
  esqlCallbacks?: ESQLCallbacks;
}

interface EditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helpText?: string;
  error?: FieldError;
  suggestionProvider: monaco.languages.CompletionItemProvider;
}

export const EditorField: React.FC<EditorFieldProps> = ({
  value,
  onChange,
  label,
  helpText,
  error,
  suggestionProvider,
}) => {
  // Display value always includes WHERE prefix
  const displayValue = WHERE_PREFIX + value;
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const disposableRef = useRef<monaco.IDisposable | null>(null);

  // Handle changes: ensure WHERE prefix is preserved, store only the condition
  const handleChange = useCallback(
    (newValue: string) => {
      if (newValue.startsWith(WHERE_PREFIX)) {
        // Normal case: user edited after the WHERE prefix
        onChange(newValue.slice(WHERE_PREFIX.length));
      } else {
        // User tried to delete/modify the WHERE prefix
        // Force a re-render by calling onChange with the current value
        // This will restore the WHERE prefix via displayValue
        onChange(value);
      }
    },
    [onChange, value]
  );

  // Set up key event handler to prevent deletion within WHERE prefix
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Intercept keyboard events to protect the WHERE prefix
    disposableRef.current = editor.onKeyDown((e) => {
      const position = editor.getPosition();
      if (!position) return;

      const cursorOffset = editor.getModel()?.getOffsetAt(position) ?? 0;
      const prefixLength = WHERE_PREFIX.length;

      // Block backspace if cursor is at or before the end of WHERE prefix
      if (e.keyCode === 1 /* Backspace */ && cursorOffset <= prefixLength) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Block delete key if cursor is within the WHERE prefix
      if (e.keyCode === 2 /* Delete */ && cursorOffset < prefixLength) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disposableRef.current?.dispose();
    };
  }, []);

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={!!error}
      error={error?.message}
      fullWidth
    >
      <EuiPanel paddingSize="none" hasShadow={false} hasBorder css={{ overflow: 'hidden' }}>
        <CodeEditor
          languageId={ESQL_LANG_ID}
          value={displayValue}
          onChange={handleChange}
          height="44px"
          suggestionProvider={suggestionProvider}
          editorDidMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            folding: false,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 14,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
          }}
        />
      </EuiPanel>
    </EuiFormRow>
  );
};

export const WhereClauseEditor: React.FC<WhereClauseEditorProps> = ({
  control,
  name,
  label,
  helpText,
  esqlCallbacks,
}) => {
  // Custom suggestion provider that wraps ES|QL autocomplete
  const suggestionProvider: monaco.languages.CompletionItemProvider = useMemo(
    () => ({
      triggerCharacters: ['.', '(', ',', ' ', ':', '=', '<', '>', '!', '"', "'"],
      async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ): Promise<monaco.languages.CompletionList> {
        const editorText = model.getValue();

        // Strip the WHERE prefix for autocomplete, then add full context
        const conditionText = editorText.startsWith(WHERE_PREFIX)
          ? editorText.slice(WHERE_PREFIX.length)
          : editorText;
        const fakeFullQuery = AUTOCOMPLETE_PREFIX + conditionText;

        // Calculate offset: subtract WHERE prefix from editor position, add autocomplete prefix
        const offsetInModel = model.getOffsetAt(position);
        const offsetInCondition = Math.max(0, offsetInModel - WHERE_PREFIX.length);
        const offsetInFakeQuery = AUTOCOMPLETE_PREFIX.length + offsetInCondition;

        try {
          const suggestions = await suggest(fakeFullQuery, offsetInFakeQuery, esqlCallbacks);

          // Convert to Monaco suggestions
          const wordInfo = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: wordInfo.startColumn,
            endColumn: wordInfo.endColumn,
          };

          return {
            suggestions: suggestions.map((s) => ({
              label: s.label,
              kind: s.kind as monaco.languages.CompletionItemKind,
              insertText: s.insertText ?? s.label,
              detail: s.detail,
              documentation: s.documentation,
              range,
              sortText: s.sortText,
            })),
          };
        } catch {
          return { suggestions: [] };
        }
      },
    }),
    [esqlCallbacks]
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        return (
          <EditorField
            value={value as string}
            onChange={onChange}
            label={label}
            helpText={helpText}
            error={error}
            suggestionProvider={suggestionProvider}
          />
        );
      }}
    />
  );
};
