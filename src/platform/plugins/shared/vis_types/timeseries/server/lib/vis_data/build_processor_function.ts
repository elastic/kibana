/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @deprecated - this method will be removed after replacing in for new one. **/
export function _legacyBuildProcessorFunction(chain: any[], ...args: any) {
  return chain.reduceRight(
    (next, fn) => fn(...args)(next),
    (doc: any) => doc
  );
}

export type ProcessorFunction<TParams = unknown, TInput = unknown, TOutput = TInput> = (
  params: TParams
) => (
  next: (doc: TOutput) => TOutput | Promise<TOutput>
) => (doc: TInput) => TOutput | Promise<TOutput>;

export const buildProcessorFunction = <
  TFunction extends Function = Function,
  TArgs = unknown,
  TResult = unknown
>(
  chain: TFunction[],
  args: TArgs
) =>
  chain.reduceRight(
    (next, fn) => fn(args)(next),
    (doc: TResult) => doc
  );
