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

import { difference, isPlainObject } from 'lodash';
import typeDetect from 'type-detect';
import { SchemaTypeError } from '../errors';
import { AnyType } from './any_type';
import { toContext } from './index';
import { Type, TypeOptions } from './type';

export type Props = Record<string, AnyType>;

export type TypeOf<RT extends AnyType> = RT['type'];

// Because of https://github.com/Microsoft/TypeScript/issues/14041
// this might not have perfect _rendering_ output, but it will be typed.

export type ObjectResultType<P extends Props> = Readonly<
  { [K in keyof P]: TypeOf<P[K]> }
>;

export class ObjectType<P extends Props = any> extends Type<
  ObjectResultType<P>
> {
  constructor(
    private readonly schema: P,
    options: TypeOptions<{ [K in keyof P]: TypeOf<P[K]> }> = {}
  ) {
    super({
      ...options,
      defaultValue: options.defaultValue,
    });
  }

  public process(value: any = {}, context?: string): ObjectResultType<P> {
    if (!isPlainObject(value)) {
      throw new SchemaTypeError(
        `expected a plain object value, but found [${typeDetect(
          value
        )}] instead.`,
        context
      );
    }

    const schemaKeys = Object.keys(this.schema);
    const valueKeys = Object.keys(value);

    // Do we have keys that exist in the values, but not in the schema?
    const missingInSchema = difference(valueKeys, schemaKeys);

    if (missingInSchema.length > 0) {
      throw new SchemaTypeError(
        `missing definitions in schema for keys [${missingInSchema.join(',')}]`,
        context
      );
    }

    return schemaKeys.reduce((newObject: any, key) => {
      const type = this.schema[key];
      newObject[key] = type.validate(value[key], toContext(context, key));
      return newObject;
    }, {});
  }
}
