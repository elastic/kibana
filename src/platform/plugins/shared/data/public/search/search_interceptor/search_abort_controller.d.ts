/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AbortReason } from '@kbn/kibana-utils-plugin/common';
export declare class SearchAbortController {
  private inputAbortSignals;
  private abortController;
  private timeoutSub?;
  private destroyed;
  constructor(timeout?: number);
  private abortHandler;
  cleanup(): void;
  addAbortSignal(inputSignal: AbortSignal): void;
  getSignal(): AbortSignal;
  abort(reason?: AbortReason): void;
  isTimeout(): boolean;
  isCanceled(): boolean;
}
