/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams } from 'antlr4ts';
import { monaco } from '../../../monaco_imports';
import { getParser } from '../antlr_facade';
import { AstListener } from '../ast/ast_factory';
import { getHoverItem, getSignatureHelp, suggest } from '../ast/autocomplete/autocomplete';
import { offsetToRowColumn } from '../ast/shared/helpers';
import { ESQLMessage } from '../ast/types';
import { validateAst } from '../ast/validation/validation';
import type { ESQLCallbacks } from '../ast/autocomplete/types';
import { ESQLErrorListener } from './esql_error_listener';

const ROOT_STATEMENT = 'singleStatement';

function wrapAsMonacoMessage(type: 'error' | 'warning', code: string, messages: ESQLMessage[]) {
  return messages.map((e) => {
    const startPosition = e.location
      ? offsetToRowColumn(code, e.location.min)
      : { column: 0, lineNumber: 0 };
    const endPosition = e.location
      ? offsetToRowColumn(code, e.location.max || 0)
      : { column: 0, lineNumber: 0 };
    return {
      message: e.text,
      startColumn: startPosition.column,
      startLineNumber: startPosition.lineNumber,
      endColumn: endPosition.column + 1,
      endLineNumber: endPosition.lineNumber,
      severity: type === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      _source: 'client' as const,
    };
  });
}

export function getLanguageProviders() {
  const getAst = (text: string | undefined) => {
    if (!text) {
      return { ast: [], errors: [] };
    }
    const inputStream = CharStreams.fromString(text);
    const errorListener = new ESQLErrorListener();
    const parseListener = new AstListener();
    const parser = getParser(inputStream, errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    const { ast } = parseListener.getAst();
    return {
      ast,
      errors: [],
    };
  };
  return {
    // used for debugging purposes only
    getAst,
    validate: async (code: string, callbacks?: ESQLCallbacks) => {
      const { ast } = getAst(code);
      const { errors, warnings } = await validateAst(ast, callbacks);
      const monacoErrors = wrapAsMonacoMessage('error', code, errors);
      const monacoWarnings = wrapAsMonacoMessage('warning', code, warnings);
      return { errors: monacoErrors, warnings: monacoWarnings };
    },
    getSignatureHelp: (callbacks?: ESQLCallbacks): monaco.languages.SignatureHelpProvider => {
      return {
        signatureHelpTriggerCharacters: [' ', '('],
        provideSignatureHelp(
          model: monaco.editor.ITextModel,
          position: monaco.Position,
          _token: monaco.CancellationToken,
          context: monaco.languages.SignatureHelpContext
        ) {
          return getSignatureHelp(model, position, context, getAst);
        },
      };
    },
    getHoverProvider: (): monaco.languages.HoverProvider => {
      return {
        provideHover: (
          model: monaco.editor.ITextModel,
          position: monaco.Position,
          token: monaco.CancellationToken
        ) => getHoverItem(model, position, token, getAst),
      };
    },
    getSuggestionProvider: (callbacks?: ESQLCallbacks): monaco.languages.CompletionItemProvider => {
      return {
        triggerCharacters: [',', '(', '=', ' '],
        async provideCompletionItems(
          model: monaco.editor.ITextModel,
          position: monaco.Position,
          context: monaco.languages.CompletionContext
        ): Promise<monaco.languages.CompletionList> {
          const suggestionEntries = await suggest(model, position, context, getAst, callbacks);
          return {
            suggestions: suggestionEntries.map((suggestion) => ({
              ...suggestion,
              range: undefined as unknown as monaco.IRange,
            })),
          };
        },
      };
    },
  };
}
