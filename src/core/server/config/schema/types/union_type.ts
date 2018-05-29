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

import { SchemaTypesError } from '../errors';
import { AnyType } from './any_type';
import { toContext } from './index';
import { Type, TypeOptions } from './type';

export class UnionType<RTS extends AnyType[], T> extends Type<T> {
  constructor(public readonly types: RTS, options?: TypeOptions<T>) {
    super(options);
  }

  public process(value: any, context?: string): T {
    const errors = [];

    for (let i = 0; i < this.types.length; i++) {
      try {
        return this.types[i].validate(value, toContext(context, i));
      } catch (e) {
        errors.push(e);
      }
    }

    throw new SchemaTypesError(errors, 'types that failed validation', context);
  }
}
