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

import { SchemaTypeError } from '../errors';

export interface TypeOptions<T> {
  defaultValue?: T;
  validate?: (value: T) => string | void;
}

const noop = () => {
  // noop
};

export abstract class Type<V> {
  // This is just to enable the `TypeOf` helper, and because TypeScript would
  // fail if it wasn't initialized we use a "trick" to which basically just
  // sets the value to `null` while still keeping the type.
  public readonly type: V = null! as V;
  private readonly defaultValue: V | void;
  private readonly validateResult: (value: V) => string | void;

  constructor({ defaultValue, validate }: TypeOptions<V> = {}) {
    this.defaultValue = defaultValue;
    this.validateResult = validate || noop;
  }

  public validate(value: any = this.defaultValue, context?: string): V {
    const result = this.process(value, context);

    const validation = this.validateResult(result);
    if (typeof validation === 'string') {
      throw new SchemaTypeError(validation, context);
    }

    return result;
  }

  protected abstract process(value: any, context?: string): V;
}
