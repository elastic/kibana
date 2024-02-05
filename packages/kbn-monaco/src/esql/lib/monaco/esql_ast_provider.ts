/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLCallbacks } from '../ast/shared/types';
import { monaco } from '../../../monaco_imports';
import type { ESQLWorker } from '../../worker/esql_worker';
import { suggest } from '../ast/autocomplete/autocomplete';
import { getHoverItem } from '../ast/hover/hover';
import { getSignatureHelp } from '../ast/signature';
import { validateAst } from '../ast/validation/validation';
import { getActions } from '../ast/code_actions/actions';
import { wrapAsMonacoMessage } from '../ast/shared/monaco_utils';

export class ESQLAstAdapter {
  constructor(
    private worker: (...uris: monaco.Uri[]) => Promise<ESQLWorker>,
    private callbacks?: ESQLCallbacks
  ) {}

  private async getAstWorker(model: monaco.editor.ITextModel) {
    const worker = await this.worker(model.uri);
    return worker.getAst;
  }

  async getAst(model: monaco.editor.ITextModel, code?: string) {
    const getAstFn = await this.getAstWorker(model);
    return getAstFn(code ?? model.getValue());
  }

  async validate(model: monaco.editor.ITextModel, code: string) {
    const getAstFn = await this.getAstWorker(model);
    const { errors, warnings } = await validateAst(
      code ?? model.getValue(),
      getAstFn,
      this.callbacks
    );
    const monacoErrors = wrapAsMonacoMessage('error', code, errors);
    const monacoWarnings = wrapAsMonacoMessage('warning', code, warnings);
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
  ) {
    const getAstFn = await this.getAstWorker(model);
    const suggestionEntries = await suggest(model, position, context, getAstFn, this.callbacks);
    return {
      suggestions: suggestionEntries.map((suggestion) => ({
        ...suggestion,
        range: undefined as unknown as monaco.IRange,
      })),
    };
  }

  async codeAction(
    model: monaco.editor.ITextModel,
    range: monaco.Range,
    context: monaco.languages.CodeActionContext
  ) {
    const getAstFn = await this.getAstWorker(model);
    const codeActions = await getActions(model, range, context, getAstFn, this.callbacks);
    return codeActions;
  }
}
