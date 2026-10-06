/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { IExecutionContextContainer } from '@kbn/core-execution-context-server';
export declare const BAGGAGE_HEADER = 'x-kbn-context';
export declare function getParentContextFrom(
  headers: Record<string, string | string[] | undefined>
): KibanaExecutionContext | undefined;
export declare const BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;
export declare class ExecutionContextContainer implements IExecutionContextContainer {
  #private;
  constructor(context: KibanaExecutionContext, parent?: IExecutionContextContainer);
  toString(): string;
  toJSON(): Readonly<KibanaExecutionContext>;
}
