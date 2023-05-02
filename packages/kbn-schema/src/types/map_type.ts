/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import typeDetect from 'type-detect';
import { SchemaTypeError, SchemaTypesError } from '../errors';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export type MapOfOptions<K, V> = TypeOptions<Map<K, V>>;

export class MapOfType<K, V> extends Type<Map<K, V>> {
  constructor(keyType: Type<K>, valueType: Type<V>, options: MapOfOptions<K, V> = {}) {
    const defaultValue = options.defaultValue;
    const schema = internals.map().entries(keyType.getSchema(), valueType.getSchema());

    super(schema, {
      ...options,
      // Joi clones default values with `Hoek.clone`, and there is bug in cloning
      // of Map/Set/Promise/Error: https://github.com/hapijs/hoek/issues/228.
      // The only way to avoid cloning and hence the bug is to use function for
      // default value instead.
      defaultValue: defaultValue instanceof Map ? () => defaultValue : defaultValue,
    });
  }

  protected handleError(
    type: string,
    { entryKey, reason, value }: Record<string, any>,
    path: string[]
  ) {
    switch (type) {
      case 'any.required':
      case 'map.base':
        return `expected value of type [Map] or [object] but got [${typeDetect(value)}]`;
      case 'map.parse':
        return `could not parse map value from json input`;
      case 'map.key':
      case 'map.value':
        const childPathWithIndex = path.slice();
        childPathWithIndex.splice(
          path.length,
          0,
          // If `key` validation failed, let's stress that to make error more obvious.
          type === 'map.key' ? `key("${entryKey}")` : entryKey.toString(),
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
