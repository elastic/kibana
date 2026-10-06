/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { ParseResult } from '../../../ace_migration/types';
export declare class XJsonWorker {
  private ctx;
  constructor(ctx: monaco.worker.IWorkerContext);
  private parser;
  parse(modelUri: string): Promise<ParseResult | undefined>;
}
