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
import { SchemaTypeError } from '../errors';
import { toContext } from './index';
import { Type, TypeOptions } from './type';

export type ArrayOptions<T> = TypeOptions<T[]> & {
  minSize?: number;
  maxSize?: number;
};

export class ArrayType<T> extends Type<T[]> {
  private readonly itemType: Type<T>;
  private readonly minSize?: number;
  private readonly maxSize?: number;

  constructor(type: Type<T>, options: ArrayOptions<T> = {}) {
    super(options);
    this.itemType = type;
    this.minSize = options.minSize;
    this.maxSize = options.maxSize;
  }

  public process(value: any, context?: string): T[] {
    if (!Array.isArray(value)) {
      throw new SchemaTypeError(
        `expected value of type [array] but got [${typeDetect(value)}]`,
        context
      );
    }

    if (this.minSize != null && value.length < this.minSize) {
      throw new SchemaTypeError(
        `array size is [${value.length}], but cannot be smaller than [${
          this.minSize
        }]`,
        context
      );
    }

    if (this.maxSize != null && value.length > this.maxSize) {
      throw new SchemaTypeError(
        `array size is [${value.length}], but cannot be greater than [${
          this.maxSize
        }]`,
        context
      );
    }

    return value.map((val, i) =>
      this.itemType.validate(val, toContext(context, i))
    );
  }
}
