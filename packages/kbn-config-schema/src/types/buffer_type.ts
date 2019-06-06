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
import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export type BufferOptions<T> = TypeOptions<T[]> & {};

export class BufferType<T> extends Type<T[]> {
  constructor(options: BufferOptions<T> = {}) {
    // we aren't using internals.binary() since it tries
    // to convert strings to Buffers, and we don't want
    // automatic conversion
    const schema = internals.any();

    super(schema, {
      ...options,
      validate: value => {
        if (!Buffer.isBuffer(value)) {
          return `expected value of type [Buffer] but got [${typeDetect(value)}]`;
        }

        if (options.validate) {
          return options.validate(value);
        }
      },
    });
  }
}
