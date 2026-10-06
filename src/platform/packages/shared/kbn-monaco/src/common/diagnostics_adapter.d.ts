/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../monaco_imports';
import type { SyntaxErrors, LangValidation, BaseWorkerDefinition } from '../types';
export type WorkerAccessor = (...uris: monaco.Uri[]) => Promise<BaseWorkerDefinition>;
export declare class DiagnosticsAdapter {
  private langId;
  private worker;
  private errors;
  private validation;
  private validateIdx;
  validation$: import('rxjs').Observable<LangValidation>;
  constructor(langId: string, worker: WorkerAccessor);
  private validate;
  getSyntaxErrors(): SyntaxErrors;
}
