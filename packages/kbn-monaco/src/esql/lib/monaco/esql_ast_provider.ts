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

const ROOT_STATEMENT = 'singleStatement';

export function createAstGenerator() {
  return {
    getAst: (model: monaco.editor.IReadOnlyModel, position: monaco.Position) => {
      const text = model?.getValue();

      if (!text) {
        return { ast: [], errors: [] };
      }
      const inputStream = CharStreams.fromString(text);
      const errorListener = new ANTLREErrorListener();
      const parseListener = new AstListener();
      const parser = getParser(inputStream, errorListener, parseListener);

      parser[ROOT_STATEMENT]();
      const ast = parseListener.getAstAndErrors();
      return ast;
    },
  };
}
