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

export type StringOptions = TypeOptions<string> & {
  minLength?: number;
  maxLength?: number;
  hostname?: boolean;
};

export class StringType extends Type<string> {
  constructor(options: StringOptions = {}) {
    // We want to allow empty strings, however calling `allow('')` casues
    // Joi to whitelist the value and skip any additional validation.
    // Instead, we reimplement the string validator manually except in the
    // hostname case where empty strings aren't allowed anyways.
    let schema =
      options.hostname === true
        ? internals.string().hostname()
        : internals.any().custom(value => {
            if (typeof value !== 'string') {
              return `expected value of type [string] but got [${typeDetect(value)}]`;
            }
          });

    if (options.minLength !== undefined) {
      schema = schema.custom(value => {
        if (value.length < options.minLength!) {
          return `value is [${value}] but it must have a minimum length of [${options.minLength}].`;
        }
      });
    }

    if (options.maxLength !== undefined) {
      schema = schema.custom(value => {
        if (value.length > options.maxLength!) {
          return `value is [${value}] but it must have a maximum length of [${options.maxLength}].`;
        }
      });
    }

    super(schema, options);
  }

  protected handleError(type: string, { limit, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
        return `expected value of type [string] but got [${typeDetect(value)}]`;
      case 'string.hostname':
        return `value is [${value}] but it must be a valid hostname (see RFC 1123).`;
    }
  }
}
