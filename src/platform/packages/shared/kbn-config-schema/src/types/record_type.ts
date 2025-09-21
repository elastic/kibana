/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { SchemaTypeError, SchemaTypesError } from '../errors';
import { internals } from '../internals';
import type {
  TypeOptions,
  ExtendsDeepOptions,
  UnknownOptions,
  DefaultValue,
  SomeType,
} from './type';
import { Type } from './type';
import { META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES } from '../oas_meta_fields';

export type RecordOfOptions<
  K extends string,
  T extends SomeType,
  D extends DefaultValue<Record<K, T['_input']>>
> = TypeOptions<Record<K, T['_output']>, Record<K, T['_input']>, D> & UnknownOptions;

export class RecordOfType<
  K extends string,
  T extends SomeType,
  D extends DefaultValue<Record<K, T['_input']>>
> extends Type<Record<K, T['_output']>, Record<K, T['_input']>, D> {
  private readonly keyType: Type<K>;
  private readonly valueType: T;
  private readonly options: RecordOfOptions<K, T, D>;

  constructor(keyType: Type<K>, valueType: T, options: RecordOfOptions<K, T, D> = {}) {
    let schema = internals
      .record()
      .entries(keyType.getSchema(), valueType.getSchema())
      .meta({
        [META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES]: () => valueType.getSchema(),
      });

    // Only set stripUnknown if we have an explicit value of unknowns
    const { unknowns } = options;
    if (unknowns) {
      schema = schema.options({ stripUnknown: { objects: unknowns === 'ignore' } });
    }

    super(schema, options);
    this.keyType = keyType;
    this.valueType = valueType;
    this.options = options;
  }

  public extendsDeep(options: ExtendsDeepOptions): RecordOfType<K, T, D> {
    return new RecordOfType(
      this.keyType.extendsDeep(options),
      this.valueType.extendsDeep(options) as T,
      this.options
    );
  }

  protected handleError(
    type: string,
    { entryKey, reason, value }: Record<string, any>,
    path: string[]
  ) {
    switch (type) {
      case 'any.required':
      case 'record.base':
        return `expected value of type [object] but got [${typeDetect(value)}]`;
      case 'record.parse':
        return `could not parse record value from json input`;
      case 'record.key':
      case 'record.value':
        const childPathWithIndex = path.slice();
        childPathWithIndex.splice(
          path.length,
          0,
          // If `key` validation failed, let's stress that to make error more obvious.
          type === 'record.key' ? `key("${entryKey}")` : entryKey.toString(),
          // Error could have happened deep inside value/key schema and error message should
          // include full path.
          ...(reason instanceof SchemaTypeError ? reason.path : [])
        );

        return reason instanceof SchemaTypesError
          ? new SchemaTypesError(reason, childPathWithIndex, reason.errors)
          : new SchemaTypeError(reason, childPathWithIndex);
    }
  }
}
