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
import { ByteSizeValue, ensureByteSizeValue } from '../byte_size_value';
import { SchemaTypeError } from '../errors';
import { internals } from '../internals';
import { Type } from './type';

export interface ByteSizeOptions {
  // we need to special-case defaultValue as we want to handle string inputs too
  validate?: (value: ByteSizeValue) => string | void;
  defaultValue?: ByteSizeValue | string | number;
  min?: ByteSizeValue | string | number;
  max?: ByteSizeValue | string | number;
}

export class ByteSizeType extends Type<ByteSizeValue> {
  constructor(options: ByteSizeOptions = {}) {
    let schema = internals.bytes();

    if (options.min !== undefined) {
      schema = schema.min(options.min);
    }

    if (options.max !== undefined) {
      schema = schema.max(options.max);
    }

    super(schema, {
      defaultValue: ensureByteSizeValue(options.defaultValue),
      validate: options.validate,
    });
  }

  protected handleError(
    type: string,
    { limit, message, value }: Record<string, any>,
    path: string[]
  ) {
    switch (type) {
      case 'any.required':
      case 'bytes.base':
        return `expected value of type [ByteSize] but got [${typeDetect(value)}]`;
      case 'bytes.parse':
        return new SchemaTypeError(message, path);
      case 'bytes.min':
        return `Value is [${value.toString()}] ([${value.toString(
          'b'
        )}]) but it must be equal to or greater than [${limit.toString()}]`;
      case 'bytes.max':
        return `Value is [${value.toString()}] ([${value.toString(
          'b'
        )}]) but it must be equal to or less than [${limit.toString()}]`;
    }
  }
}
