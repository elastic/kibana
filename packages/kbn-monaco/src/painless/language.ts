/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { monaco } from '../monaco_imports';

import { WorkerProxyService, EditorStateService } from './services';
import { ID } from './constants';
import { PainlessContext, Field } from './types';
import { PainlessWorker } from './worker';
import { PainlessCompletionAdapter } from './completion_adapter';

const workerProxyService = new WorkerProxyService();
const editorStateService = new EditorStateService();

type WorkerAccessor = (...uris: monaco.Uri[]) => Promise<PainlessWorker>;

const worker: WorkerAccessor = (...uris: monaco.Uri[]): Promise<PainlessWorker> => {
  return workerProxyService.getWorker(uris);
};

monaco.languages.onLanguage(ID, async () => {
  workerProxyService.setup();
});

export const getSuggestionProvider = (context: PainlessContext, fields?: Field[]) => {
  editorStateService.setup(context, fields);

  return new PainlessCompletionAdapter(worker, editorStateService);
};
