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

import { Transform } from 'stream';

/**
 *  Create a Transform stream that accepts strings (in
 *  object mode) and parsed those streams to provide their
 *  JavaScript value.
 *
 *  Parse errors are emitted with the "error" event, and
 *  if not caught will cause the process to crash. When caught
 *  the stream will continue to parse subsequent values.
 *
 *  @return {Transform}
 */
export function createJsonParseStream() {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform(json, enc, callback) {
      let parsed;
      let error;

      try {
        parsed = JSON.parse(json);
      } catch (_error) {
        error = _error;
      }

      callback(error, parsed);
    }
  });
}

/**
 *  Create a Transform stream that accepts arbitrary JavaScript
 *  values, stringifies them, and provides the output in object
 *  mode to consumers.
 *
 *  Serialization errors are emitted with the "error" event, and
 *  if not caught will cause the process to crash. When caught
 *  the stream will continue to stringify subsequent values.
 *
 *  @param  {Object} options
 *  @property {Boolean} options.pretty
 *  @return {Transform}
 */
export function createJsonStringifyStream({ pretty = false } = {}) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform(json, enc, callback) {
      try {
        callback(null, JSON.stringify(json, null, pretty ? 2 : 0));
      } catch (err) {
        callback(err);
      }
    }
  });
}
