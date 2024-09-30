/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CharStreams } from 'antlr4';
import {
  getAstAndSyntaxErrors,
  getParser,
  ROOT_STATEMENT,
  ESQLErrorListener,
  type EditorError,
} from '@kbn/esql-ast';
import type { monaco } from '../../monaco_imports';
import type { BaseWorkerDefinition } from '../../types';

/**
 * While this function looks similar to the wrapAsMonacoMessages one, it prevents from
 * loading the whole monaco stuff within the WebWorker.
 * Given that we're dealing only with EditorError objects here, and not other types, it is
 * possible to use this simpler inline function to work.
 */
function inlineToMonacoErrors({ severity, ...error }: EditorError) {
  return {
    ...error,
    severity: severity === 'error' ? 8 : 4, // monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning
  };
}

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

      return errorListener.getErrors().map(inlineToMonacoErrors);
    }
    return [];
  }

  getAst(text: string | undefined) {
    const rawAst = getAstAndSyntaxErrors(text);
    return {
      ast: rawAst.ast,
      errors: rawAst.errors.map(inlineToMonacoErrors),
    };
  }
}
