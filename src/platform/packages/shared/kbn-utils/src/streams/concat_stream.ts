/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReduceStream } from './reduce_stream';

/**
 *  Creates a Transform stream that consumes all provided
 *  values and concatenates them using each values `concat`
 *  method.
 *
 *  Concatenate strings:
 *    createListStream(['f', 'o', 'o'])
 *      .pipe(createConcatStream())
 *      .on('data', console.log)
 *      // logs "foo"
 *
 *  Concatenate values into an array:
 *    createListStream([1,2,3])
 *      .pipe(createConcatStream([]))
 *      .on('data', console.log)
 *      // logs "[1,2,3]"
 *
 *
 *  @param {any} initial The initial value that subsequent
 *                       items will concat with
 *  @return {Transform}
 */
export function createConcatStream<T>(initial?: T) {
  return createReduceStream((acc, chunk) => acc.concat(chunk), initial);
}
