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
import { Type, TypeOptions } from './type';

export type NumberOptions = TypeOptions<number> & {
  min?: number;
  max?: number;
};

export class NumberType extends Type<number> {
  private readonly min: number | void;
  private readonly max: number | void;

  constructor(options: NumberOptions = {}) {
    super(options);
    this.min = options.min;
    this.max = options.max;
  }

  public process(value: any, context?: string): number {
    const type = typeDetect(value);

    // Do we want to allow strings that can be converted, e.g. "2"? (Joi does)
    // (this can for example be nice in http endpoints with query params)
    //
    // From Joi docs on `Joi.number`:
    // > Generates a schema object that matches a number data type (as well as
    // > strings that can be converted to numbers)
    if (typeof value === 'string') {
      value = Number(value);
    }

    if (typeof value !== 'number' || isNaN(value)) {
      throw new SchemaTypeError(
        `expected value of type [number] but got [${type}]`,
        context
      );
    }

    if (this.min && value < this.min) {
      throw new SchemaTypeError(
        `Value is [${value}] but it must be equal to or greater than [${
          this.min
        }].`,
        context
      );
    }

    if (this.max && value > this.max) {
      throw new SchemaTypeError(
        `Value is [${value}] but it must be equal to or lower than [${
          this.max
        }].`,
        context
      );
    }

    return value;
  }
}
