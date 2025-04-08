/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLCallbacks, suggest, validateQuery } from '@kbn/esql-validation-autocomplete';
import { monaco } from '../../../monaco_imports';
import type { ESQLWorker } from '../worker/esql_worker';
import { wrapAsMonacoMessages } from './converters/positions';
import { getHoverItem } from './hover/hover';
import { monacoPositionToOffset, offsetRangeToMonacoRange } from './shared/utils';
import { getSignatureHelp } from './signature';
import { SuggestionRawDefinitionWithMonacoRange } from './types';

export class ESQLAstAdapter {
  constructor(
    private worker: (...uris: monaco.Uri[]) => Promise<ESQLWorker>,
    private callbacks?: ESQLCallbacks
  ) {}

  private async getAstWorker(model: monaco.editor.ITextModel) {
    const worker = await this.worker(model.uri);
    return async (...args) => {
      const start = Date.now();
      // console.log('AST requested (main thread)', Date.now());
      const res = await worker.getAst(...args);
      // console.log('AST received (main thread)', Date.now());
      const end = Date.now();

      res.timings.parseRequested = start;
      res.timings.astReceived = end;
      return res;
    };
  }

  async getAst(model: monaco.editor.ITextModel, code?: string) {
    const getAstFn = await this.getAstWorker(model);
    return getAstFn(code ?? model.getValue());
  }

  async validate(model: monaco.editor.ITextModel, code: string) {
    const getAstFn = await this.getAstWorker(model);
    const text = code ?? model.getValue();
    const start = Date.now();
    // console.log(`validation started`, start);
    const { errors, warnings, timings } = await validateQuery(
      text,
      getAstFn,
      undefined,
      this.callbacks
    );
    // console.log(threadTimings);
    const end = Date.now();
    // console.log(`validation ended`, end);
    // console.log(`validation took ${Date.now() - start}`);
    console.log(`-------------------------------------`);
    console.log('time_to_request_parse', timings.parseRequested - start);
    console.log('time_to_worker', timings.parseStart - start);
    console.log('time_to_parse', timings.parseEnd - timings.parseStart);
    console.log('time_to_main', timings.astReceived - timings.parseEnd);
    console.log('time_to_validate', end - timings.astReceived);
    const monacoErrors = wrapAsMonacoMessages(text, errors);
    const monacoWarnings = wrapAsMonacoMessages(text, warnings);
    return { errors: monacoErrors, warnings: monacoWarnings };
  }

  async suggestSignature(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.SignatureHelpContext
  ) {
    const getAstFn = await this.getAstWorker(model);
    return getSignatureHelp(model, position, context, getAstFn);
  }

  async getHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    token: monaco.CancellationToken
  ) {
    const getAstFn = await this.getAstWorker(model);
    return getHoverItem(model, position, token, getAstFn, this.callbacks);
  }

  async autocomplete(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext
  ): Promise<SuggestionRawDefinitionWithMonacoRange[]> {
    const getAstFn = await this.getAstWorker(model);
    const fullText = model.getValue();
    const offset = monacoPositionToOffset(fullText, position);
    const suggestions = await suggest(fullText, offset, context, getAstFn, this.callbacks);
    for (const s of suggestions) {
      (s as SuggestionRawDefinitionWithMonacoRange).range = s.rangeToReplace
        ? offsetRangeToMonacoRange(fullText, s.rangeToReplace)
        : undefined;
    }
    return suggestions;
  }
}
