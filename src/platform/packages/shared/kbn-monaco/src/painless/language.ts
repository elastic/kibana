/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, of } from 'rxjs';
import { monaco } from '../monaco_imports';
import { ID } from './constants';

import type { LangValidation, SyntaxErrors } from '../types';
import type { PainlessContext, PainlessAutocompleteField } from './types';
import type { PainlessWorker } from './worker';
import { EditorStateService } from './lib';
import { PainlessCompletionAdapter } from './completion_adapter';
import { DiagnosticsAdapter } from '../common/diagnostics_adapter';
import { WorkerProxyService } from '../common/worker_proxy';

const workerProxyService = new WorkerProxyService<PainlessWorker>();
const editorStateService = new EditorStateService();

const worker = (...uris: monaco.Uri[]): Promise<PainlessWorker> => {
  return workerProxyService.getWorker(uris);
};

export const getSuggestionProvider = (
  context: PainlessContext,
  fields?: PainlessAutocompleteField[]
) => {
  editorStateService.setup(context, fields);

  return new PainlessCompletionAdapter(worker, editorStateService);
};

let diagnosticsAdapter: DiagnosticsAdapter;

// Returns syntax errors for all models by model id
export const getSyntaxErrors = (): SyntaxErrors => {
  return diagnosticsAdapter?.getSyntaxErrors() ?? {};
};

export const validation$: () => Observable<LangValidation> = () =>
  diagnosticsAdapter?.validation$ ||
  of<LangValidation>({ isValid: true, isValidating: false, errors: [] });

monaco.languages.onLanguage(ID, async () => {
  workerProxyService.setup(ID);

  diagnosticsAdapter = new DiagnosticsAdapter(ID, worker);
});
