/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { monaco } from '../monaco_imports';

import { WorkerProxyService, EditorStateService } from './lib';
import { ID } from './constants';
import { PainlessContext, PainlessAutocompleteField } from './types';
import { PainlessWorker } from './worker';
import { PainlessCompletionAdapter } from './completion_adapter';
import { DiagnosticsAdapter } from './diagnostics_adapter';

const workerProxyService = new WorkerProxyService();
const editorStateService = new EditorStateService();

export type WorkerAccessor = (...uris: monaco.Uri[]) => Promise<PainlessWorker>;

const worker: WorkerAccessor = (...uris: monaco.Uri[]): Promise<PainlessWorker> => {
  return workerProxyService.getWorker(uris);
};

export const getSuggestionProvider = (
  context: PainlessContext,
  fields?: PainlessAutocompleteField[]
) => {
  editorStateService.setup(context, fields);

  return new PainlessCompletionAdapter(worker, editorStateService);
};

monaco.languages.onLanguage(ID, async () => {
  workerProxyService.setup();

  new DiagnosticsAdapter(worker);
});
