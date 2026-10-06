/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../monaco_imports';
import type { BaseWorkerDefinition } from '../types';
export declare class WorkerProxyService<IWorker extends BaseWorkerDefinition> {
  private worker;
  getWorker(resources: monaco.Uri[]): Promise<IWorker>;
  setup(langId: string): void;
  stop(): void;
}
