/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';
import { ExpressionFunction } from '@kbn/expressions-plugin/common';
import {
  AutocompleteSuggestion,
  getAutocompleteSuggestions,
  getFnArgDefAtPosition,
} from './autocomplete';

import { getFunctionReferenceStr, getArgReferenceStr } from './reference';

export const getSuggestionProvider = (expressionFunctions: ExpressionFunction[]) => {
  const provideCompletionItems = (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext
  ) => {
    const text = model.getValue();
    const textRange = model.getFullModelRange();

    const lengthAfterPosition = model.getValueLengthInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: textRange.endLineNumber,
      endColumn: textRange.endColumn,
    });

    let wordRange: monaco.Range;
    let aSuggestions;

    if (context.triggerCharacter === '{') {
      const wordUntil = model.getWordAtPosition(position.delta(0, -3));
      if (wordUntil) {
        wordRange = new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        );

        // Retrieve suggestions for subexpressions
        // TODO: make this work for expressions nested more than one level deep
        aSuggestions = getAutocompleteSuggestions(
          expressionFunctions,
          text.substring(0, text.length - lengthAfterPosition) + '}',
          text.length - lengthAfterPosition
        );
      }
    } else {
      const wordUntil = model.getWordUntilPosition(position);
      wordRange = new monaco.Range(
        position.lineNumber,
        wordUntil.startColumn,
        position.lineNumber,
        wordUntil.endColumn
      );
      aSuggestions = getAutocompleteSuggestions(
        expressionFunctions,
        text,
        text.length - lengthAfterPosition
      );
    }

    if (!aSuggestions) {
      return { suggestions: [] };
    }

    const suggestions = aSuggestions.map((s: AutocompleteSuggestion, index) => {
      const sortText = String.fromCharCode(index);
      if (s.type === 'argument') {
        return {
          label: s.argDef.name,
          kind: monaco.languages.CompletionItemKind.Variable,
          documentation: { value: getArgReferenceStr(s.argDef), isTrusted: true },
          insertText: s.text,
          command: {
            title: 'Trigger Suggestion Dialog',
            id: 'editor.action.triggerSuggest',
          },
          range: wordRange,
          sortText,
        };
      } else if (s.type === 'value') {
        return {
          label: s.text,
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: s.text,
          command: {
            title: 'Trigger Suggestion Dialog',
            id: 'editor.action.triggerSuggest',
          },
          range: wordRange,
          sortText,
        };
      } else {
        return {
          label: s.fnDef.name,
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: {
            value: getFunctionReferenceStr(s.fnDef),
            isTrusted: true,
          },
          insertText: s.text,
          command: {
            title: 'Trigger Suggestion Dialog',
            id: 'editor.action.triggerSuggest',
          },
          range: wordRange,
          sortText,
        };
      }
    });

    return {
      suggestions,
    };
  };
  return {
    triggerCharacters: [' ', '{'],
    provideCompletionItems,
  };
};

export const getHoverProvider = (expressionFunctions: ExpressionFunction[]) => {
  const provideHover = (model: monaco.editor.ITextModel, position: monaco.Position) => {
    const text = model.getValue();
    const word = model.getWordAtPosition(position);

    if (!word) {
      return {
        contents: [],
      };
    }

    const absPosition = model.getValueLengthInRange({
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn,
    });

    const { fnDef, argDef, argStart, argEnd } = getFnArgDefAtPosition(
      expressionFunctions,
      text,
      absPosition
    );

    if (argDef && argStart && argEnd) {
      // Use the start/end position of the arg to generate a complete range to highlight
      // that includes the arg name and its complete value
      const startPos = model.getPositionAt(argStart);
      const endPos = model.getPositionAt(argEnd);

      const argRange = new monaco.Range(
        startPos.lineNumber,
        startPos.column,
        endPos.lineNumber,
        endPos.column
      );

      return {
        contents: [{ value: getArgReferenceStr(argDef), isTrusted: true }],
        range: argRange,
      };
    } else if (fnDef) {
      return {
        contents: [
          {
            value: getFunctionReferenceStr(fnDef),
            isTrusted: true,
          },
        ],
      };
    }

    return {
      contents: [],
    };
  };

  return { provideHover };
};
