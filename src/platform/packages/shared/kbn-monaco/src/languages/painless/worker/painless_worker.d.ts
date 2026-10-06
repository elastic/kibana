/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';
import type {
  PainlessCompletionResult,
  PainlessContext,
  PainlessAutocompleteField,
} from '../types';
import type { BaseWorkerDefinition } from '../../../types';
export declare class PainlessWorker implements BaseWorkerDefinition {
  private _ctx;
  constructor(ctx: monaco.worker.IWorkerContext);
  private getTextDocument;
  getSyntaxErrors(
    modelUri: string
  ): Promise<import('@kbn/code-editor').MonacoEditorError[] | undefined>;
  provideAutocompleteSuggestions(
    currentLineChars: string,
    context: PainlessContext,
    fields?: PainlessAutocompleteField[]
  ): PainlessCompletionResult;
}
