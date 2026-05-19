/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transform } from 'stream';
/**
 *  Create a transform stream that consumes each chunk it receives
 *  and passes it to the reducer, which will return the new value
 *  for the stream. Once all chunks have been received the reduce
 *  stream provides the result of final call to the reducer to
 *  subscribers.
 *
 *  @param  {Function}
 *  @param  {any} initial Initial value for the stream, if undefined
 *                        then the first chunk provided is used as the
 *                        initial value.
 *  @return {Transform}
 */
export declare function createReduceStream<T>(
  reducer: (value: any, chunk: T, enc: string) => T,
  initial?: T
): Transform;
