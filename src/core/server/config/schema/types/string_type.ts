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

export type StringOptions = TypeOptions<string> & {
  minLength?: number;
  maxLength?: number;
};

export class StringType extends Type<string> {
  private readonly minLength: number | void;
  private readonly maxLength: number | void;

  constructor(options: StringOptions = {}) {
    super(options);
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;
  }

  public process(value: any, context?: string): string {
    if (typeof value !== 'string') {
      throw new SchemaTypeError(
        `expected value of type [string] but got [${typeDetect(value)}]`,
        context
      );
    }

    if (this.minLength && value.length < this.minLength) {
      throw new SchemaTypeError(
        `value is [${value}] but it must have a minimum length of [${
          this.minLength
        }].`,
        context
      );
    }

    if (this.maxLength && value.length > this.maxLength) {
      throw new SchemaTypeError(
        `value is [${value}] but it must have a maximum length of [${
          this.maxLength
        }].`,
        context
      );
    }

    return value;
  }
}
