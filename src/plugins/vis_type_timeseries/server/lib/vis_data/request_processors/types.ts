/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type RequestProcessorsFunction<
  TParams = unknown,
  TInput = Record<string, unknown>,
  TOutput = TInput
> = (
  params: TParams
) => (
  next: (doc: TOutput) => TOutput | Promise<TOutput>
) => (doc: TInput) => TOutput | Promise<TOutput>;
