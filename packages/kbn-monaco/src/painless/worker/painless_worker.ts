/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { monaco } from '../../monaco_imports';
import { PainlessCompletionResult, PainlessContext, PainlessAutocompleteField } from '../types';

import { getAutocompleteSuggestions, parseAndGetSyntaxErrors } from './lib';
export class PainlessWorker {
  private _ctx: monaco.worker.IWorkerContext;

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
      return parseAndGetSyntaxErrors(code);
    }
  }

  public provideAutocompleteSuggestions(
    currentLineChars: string,
    context: PainlessContext,
    fields?: PainlessAutocompleteField[]
  ): PainlessCompletionResult {
    // Array of the active line words, e.g., [boolean, isTrue, =, true]
    const words = currentLineChars.replace('\t', '').split(' ');

    const autocompleteSuggestions: PainlessCompletionResult = getAutocompleteSuggestions(
      context,
      words,
      fields
    );

    return autocompleteSuggestions;
  }
}
