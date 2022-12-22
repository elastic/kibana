/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CharStreams } from 'antlr4ts';
import { monaco } from '../../monaco_imports';
import type { BaseWorkerDefinition } from '../../types';
import { getParser } from '../lib/antlr_facade';
import { ANTLREErrorListener } from '../../common/error_listener';

export class ESQLWorker implements BaseWorkerDefinition {
  private readonly _ctx: monaco.worker.IWorkerContext;

  constructor(ctx: monaco.worker.IWorkerContext) {
    this._ctx = ctx;
  }

  private getTextDocument(modelUri: string): string | undefined {
    const model = this._ctx.getMirrorModels().find((m) => m.uri.toString() === modelUri);

    return model?.getValue();
  }

  public async getSyntaxErrors(modelUri: string) {
    const code = this.getTextDocument(modelUri);

    if (code) {
      const inputStream = CharStreams.fromString(code);
      const errorListener = new ANTLREErrorListener();
      const parser = getParser(inputStream, errorListener);

      parser.singleStatement();

      return errorListener.getErrors();
    }
  }
}
