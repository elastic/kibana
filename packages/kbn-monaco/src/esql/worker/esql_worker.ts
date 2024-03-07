/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams } from 'antlr4';
import type { monaco } from '../../monaco_imports';
import type { BaseWorkerDefinition } from '../../types';
import { getParser, ROOT_STATEMENT } from '../lib/antlr_facade';
import { AstListener } from '../lib/ast/ast_factory';
import { ESQLErrorListener } from '../lib/monaco/esql_error_listener';

export class ESQLWorker implements BaseWorkerDefinition {
  private readonly _ctx: monaco.worker.IWorkerContext;

  constructor(ctx: monaco.worker.IWorkerContext) {
    this._ctx = ctx;
  }

  private getModelCharStream(modelUri: string) {
    const model = this._ctx.getMirrorModels().find((m) => m.uri.toString() === modelUri);
    const text = model?.getValue();

    if (text) {
      return CharStreams.fromString(text);
    }
  }

  public async getSyntaxErrors(modelUri: string) {
    const inputStream = this.getModelCharStream(modelUri);

    if (inputStream) {
      const errorListener = new ESQLErrorListener();
      const parser = getParser(inputStream, errorListener);

      parser[ROOT_STATEMENT]();

      return errorListener.getErrors();
    }
    return [];
  }

  async getAst(text: string | undefined) {
    if (!text) {
      return { ast: [], errors: [] };
    }
    const inputStream = CharStreams.fromString(text);
    const errorListener = new ESQLErrorListener();
    const parserListener = new AstListener();
    const parser = getParser(inputStream, errorListener, parserListener);

    parser[ROOT_STATEMENT]();

    const { ast } = parserListener.getAst();
    return {
      ast,
      errors: errorListener.getErrors(),
    };
  }
}
