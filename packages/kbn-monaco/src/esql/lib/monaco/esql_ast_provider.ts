/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams } from 'antlr4ts';
import { ANTLREErrorListener } from '../../../common/error_listener';
import { monaco } from '../../../monaco_imports';
import { getParser } from '../antlr_facade';
import { AstListener } from '../ast/ast_factory';
import { suggest } from '../ast/autocomplete';
import { offsetToRowColumn } from '../ast/helpers';
import { ESQLMessage } from '../ast/types';
import { validateAst } from '../ast/validation';
import { ESQLCustomAutocompleteCallbacks } from '../autocomplete/types';

const ROOT_STATEMENT = 'singleStatement';

function createParserListener(debug: boolean = false) {
  const parserListener = new AstListener();
  if (debug) {
    let indentation = 0;
    for (const prop of Object.getOwnPropertyNames(AstListener.prototype)) {
      // @ts-expect-error
      if (typeof parserListener[prop] === 'function' && /^(enter|exit)/.test(prop)) {
        // @ts-expect-error
        const oldFn = parserListener[prop];
        // @ts-expect-error
        parserListener[prop] = (...args) => {
          indentation = Math.max(indentation + (/^exit/.test(prop) ? -1 : 0), 0);
          // eslint-disable-next-line no-console
          console.log(`${Array(indentation).fill('\t').join('')}${prop}`);
          indentation = indentation + (/^enter/.test(prop) ? 1 : 0);
          return oldFn?.bind(parserListener)(...args);
        };
      }
    }
  }
  return parserListener;
}

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
      source: 'client' as const,
    };
  });
}

export function createAstGenerator(callbacks?: ESQLCustomAutocompleteCallbacks) {
  const getAst = (model: monaco.editor.ITextModel, position: monaco.Position) => {
    const text = model?.getValue();

    if (!text) {
      return { ast: [], errors: [] };
    }
    const inputStream = CharStreams.fromString(text.toLowerCase());
    const errorListener = new ANTLREErrorListener();
    const parseListener = createParserListener();
    const parser = getParser(inputStream, errorListener, parseListener);

    parser[ROOT_STATEMENT]();

    const ast = parseListener.getAstAndErrors();
    return ast;
  };
  return {
    getAst,
    validate: (model: monaco.editor.ITextModel, position: monaco.Position) => {
      const { ast, errors: syntaxErrors } = getAst(model, position);
      const { errors, warnings } = validateAst(ast);
      const code = model?.getValue();
      const monacoErrors = wrapAsMonacoMessage('error', code, syntaxErrors.concat(errors));
      const monacoWarnings = wrapAsMonacoMessage('warning', code, warnings);
      return { errors: monacoErrors, warnings: monacoWarnings };
    },
    getSuggestions: (): monaco.languages.CompletionItemProvider => {
      return {
        triggerCharacters: [',', '(', '=', ' '], // [',', '.', '(', '=', ' '],
        async provideCompletionItems(
          model: monaco.editor.ITextModel,
          position: monaco.Position,
          context: monaco.languages.CompletionContext
        ): Promise<monaco.languages.CompletionList> {
          return suggest(model, position, context, callbacks);
        },
      };
    },
  };
}
