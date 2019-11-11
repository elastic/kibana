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

export type RecordOfOptions<K extends string, V> = TypeOptions<Record<K, V>>;

export class RecordOfType<K extends string, V> extends Type<Record<K, V>> {
  constructor(keyType: Type<K>, valueType: Type<V>, options: RecordOfOptions<K, V> = {}) {
    const schema = internals.record().entries(keyType.getSchema(), valueType.getSchema());

    super(schema, options);
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
      case 'record.key':
      case 'record.value':
        const childPathWithIndex = path.slice();
        childPathWithIndex.splice(
          path.length,
          0,
          // If `key` validation failed, let's stress that to make error more obvious.
          type === 'record.key' ? `key("${entryKey}")` : entryKey.toString()
        );

        return reason instanceof SchemaTypesError
          ? new SchemaTypesError(reason, childPathWithIndex, reason.errors)
          : new SchemaTypeError(reason, childPathWithIndex);
    }
  }
}
