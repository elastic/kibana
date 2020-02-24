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

export type ArrayOptions<T> = TypeOptions<T[]> & {
  minSize?: number;
  maxSize?: number;
};

export class ArrayType<T> extends Type<T[]> {
  constructor(type: Type<T>, options: ArrayOptions<T> = {}) {
    let schema = internals
      .array()
      .items(type.getSchema().optional())
      .sparse();

    if (options.minSize !== undefined) {
      schema = schema.min(options.minSize);
    }

    if (options.maxSize !== undefined) {
      schema = schema.max(options.maxSize);
    }

    super(schema, options);
  }

  protected handleError(type: string, { limit, reason, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'array.base':
        return `expected value of type [array] but got [${typeDetect(value)}]`;
      case 'array.parse':
        return `could not parse array value from [${value}]`;
      case 'array.min':
        return `array size is [${value.length}], but cannot be smaller than [${limit}]`;
      case 'array.max':
        return `array size is [${value.length}], but cannot be greater than [${limit}]`;
      case 'array.includesOne':
        return reason[0];
    }
  }
}
