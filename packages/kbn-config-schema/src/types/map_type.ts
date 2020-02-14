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
        return `could not parse map value from [${value}]`;
      case 'map.key':
      case 'map.value':
        const childPathWithIndex = path.slice();
        childPathWithIndex.splice(
          path.length,
          0,
          // If `key` validation failed, let's stress that to make error more obvious.
          type === 'map.key' ? `key("${entryKey}")` : entryKey.toString()
        );

        return reason instanceof SchemaTypesError
          ? new SchemaTypesError(reason, childPathWithIndex, reason.errors)
          : new SchemaTypeError(reason, childPathWithIndex);
    }
  }
}
