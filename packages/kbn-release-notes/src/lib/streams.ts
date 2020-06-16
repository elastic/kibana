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

import { promisify } from 'util';
import { Readable, pipeline } from 'stream';

/**
 * @types/node still doesn't have this method that was added
 * in 10.17.0 https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
 */
export function streamFromIterable(
  iter: Iterable<string | Buffer> | AsyncIterable<string | Buffer>
): Readable {
  // @ts-ignore
  return Readable.from(iter);
}

export const asyncPipeline = promisify(pipeline);
