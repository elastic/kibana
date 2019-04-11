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
export function createConcatStream(initial) {
  return createReduceStream((acc, chunk) => acc.concat(chunk), initial);
}
