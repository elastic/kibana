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
import { validateAst } from '../ast/validation';

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

export function createAstGenerator() {
  const getAst = (model: monaco.editor.IReadOnlyModel, position: monaco.Position) => {
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
    validateAst: (model: monaco.editor.IReadOnlyModel, position: monaco.Position) => {
      const { ast, errors: syntaxErrors } = getAst(model, position);
      const { errors, warnings } = validateAst(ast);
      return { errors: syntaxErrors.concat(errors), warnings };
    },
  };
}
