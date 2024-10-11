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
import { Type, TypeOptions, ExtendsDeepOptions } from './type';
import { META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES } from '../oas_meta_fields';

export type RecordOfOptions<K extends string, V> = TypeOptions<Record<K, V>>;

export class RecordOfType<K extends string, V> extends Type<Record<K, V>> {
  private readonly keyType: Type<K>;
  private readonly valueType: Type<V>;
  private readonly options: RecordOfOptions<K, V>;

  constructor(keyType: Type<K>, valueType: Type<V>, options: RecordOfOptions<K, V> = {}) {
    const schema = internals
      .record()
      .entries(keyType.getSchema(), valueType.getSchema())
      .meta({
        [META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES]: () => valueType.getSchema(),
      });

    super(schema, options);
    this.keyType = keyType;
    this.valueType = valueType;
    this.options = options;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new RecordOfType(
      this.keyType.extendsDeep(options),
      this.valueType.extendsDeep(options),
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
