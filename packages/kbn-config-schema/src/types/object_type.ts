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
import { AnySchema, internals } from '../internals';
import { Type, TypeOptions } from './type';
import { ValidationError } from '../errors';

export type Props = Record<string, Type<any>>;

export type TypeOf<RT extends Type<any>> = RT['type'];

type OptionalProperties<Base extends Props> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? Key : never;
  }[keyof Base]
>;

type RequiredProperties<Base extends Props> = Pick<
  Base,
  {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? never : Key;
  }[keyof Base]
>;

// Because of https://github.com/Microsoft/TypeScript/issues/14041
// this might not have perfect _rendering_ output, but it will be typed.
export type ObjectResultType<P extends Props> = Readonly<
  { [K in keyof OptionalProperties<P>]?: TypeOf<P[K]> } &
    { [K in keyof RequiredProperties<P>]: TypeOf<P[K]> }
>;

interface UnknownOptions {
  /**
   * Options for dealing with unknown keys:
   * - allow: unknown keys will be permitted
   * - ignore: unknown keys will not fail validation, but will be stripped out
   * - forbid (default): unknown keys will fail validation
   */
  unknowns?: 'allow' | 'ignore' | 'forbid';
}

export type ObjectTypeOptions<P extends Props = any> = TypeOptions<ObjectResultType<P>> &
  UnknownOptions;

export class ObjectType<P extends Props = any> extends Type<ObjectResultType<P>> {
  private props: Record<string, AnySchema>;

  constructor(props: P, { unknowns = 'forbid', ...typeOptions }: ObjectTypeOptions<P> = {}) {
    const schemaKeys = {} as Record<string, AnySchema>;
    for (const [key, value] of Object.entries(props)) {
      schemaKeys[key] = value.getSchema();
    }
    const schema = internals
      .object()
      .keys(schemaKeys)
      .default()
      .optional()
      .unknown(unknowns === 'allow')
      .options({ stripUnknown: { objects: unknowns === 'ignore' } });

    super(schema, typeOptions);
    this.props = schemaKeys;
  }

  protected handleError(type: string, { reason, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'object.base':
        return `expected a plain object value, but found [${typeDetect(value)}] instead.`;
      case 'object.parse':
        return `could not parse object value from json input`;
      case 'object.allowUnknown':
        return `definition for this key is missing`;
      case 'object.child':
        return reason[0];
    }
  }

  validateKey(key: string, value: any) {
    if (!this.props[key]) {
      throw new Error(`${key} is not a valid part of this schema`);
    }
    const { value: validatedValue, error } = this.props[key].validate(value);
    if (error) {
      throw new ValidationError(error as any, key);
    }
    return validatedValue;
  }
}
