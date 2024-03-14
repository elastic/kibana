/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CodeAction,
  EditorError,
  ESQLMessage,
  SuggestionRawDefinition,
} from '@kbn/esql-ast-core';
import type { MonacoEditorError } from '../../types';
import { monaco } from '../../monaco_imports';
import type { MonacoAutocompleteCommandDefinition, MonacoCodeAction } from './types';

// from linear offset to Monaco position
export function offsetToRowColumn(expression: string, offset: number): monaco.Position {
  const lines = expression.split(/\n/);
  let remainingChars = offset;
  let lineNumber = 1;
  for (const line of lines) {
    if (line.length >= remainingChars) {
      return new monaco.Position(lineNumber, remainingChars + 1);
    }
    remainingChars -= line.length + 1;
    lineNumber++;
  }

  throw new Error('Algorithm failure');
}

function convertSeverityToMonacoKind(severity: 'error' | 'warning' | number) {
  if (typeof severity === 'number') return severity;
  return severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning;
}

export function wrapAsMonacoMessages(
  queryString: string,
  messages: Array<ESQLMessage | EditorError>
): MonacoEditorError[] {
  const fallbackPosition = { column: 0, lineNumber: 0 };
  return messages.map((e) => {
    if ('severity' in e) {
      return {
        ...e,
        severity: convertSeverityToMonacoKind(e.severity),
      };
    }
    const startPosition = e.location
      ? offsetToRowColumn(queryString, e.location.min)
      : fallbackPosition;
    const endPosition = e.location
      ? offsetToRowColumn(queryString, e.location.max || 0)
      : fallbackPosition;
    return {
      message: e.text,
      startColumn: startPosition.column,
      startLineNumber: startPosition.lineNumber,
      endColumn: endPosition.column + 1,
      endLineNumber: endPosition.lineNumber,
      severity: convertSeverityToMonacoKind(e.type),
      _source: 'client' as const,
      code: e.code,
    };
  });
}

// From Monaco position to linear offset
export function monacoPositionToOffset(expression: string, position: monaco.Position): number {
  const lines = expression.split(/\n/);
  return lines
    .slice(0, position.lineNumber)
    .reduce(
      (prev, current, index) =>
        prev + (index === position.lineNumber - 1 ? position.column - 1 : current.length + 1),
      0
    );
}

export function wrapAsMonacoCodeActions(
  model: monaco.editor.ITextModel,
  actions: CodeAction[]
): MonacoCodeAction[] {
  const queryString = model.getValue();
  const uri = model.uri;
  return actions.map((action) => {
    const [error] = wrapAsMonacoMessages(queryString, action.diagnostics);
    return {
      title: action.title,
      diagnostics: [error],
      kind: action.kind,
      edit: {
        edits: action.edits.map((edit) => {
          return {
            resource: uri,
            textEdit: {
              range: error,
              text: edit.text,
            },
            versionId: undefined,
          };
        }),
      },
    };
  });
}

export function wrapAsMonacoSuggestions(
  suggestions: SuggestionRawDefinition[]
): MonacoAutocompleteCommandDefinition[] {
  return suggestions.map(
    ({ label, text, asSnippet, kind, detail, documentation, sortText, command }) => ({
      label,
      insertText: text,
      kind,
      detail,
      documentation,
      sortText,
      command,
      insertTextRules: asSnippet
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
      range: undefined as unknown as monaco.IRange,
    })
  );
}
