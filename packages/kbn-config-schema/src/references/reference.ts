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

import { internals, Reference as InternalReference } from '../internals';

export class Reference<T> {
  public static isReference<V>(value: V | Reference<V> | undefined): value is Reference<V> {
    return (
      value != null &&
      typeof (value as Reference<V>).getSchema === 'function' &&
      internals.isRef((value as Reference<V>).getSchema())
    );
  }

  private readonly internalSchema: InternalReference;

  constructor(key: string) {
    this.internalSchema = internals.ref(key);
  }

  public getSchema() {
    return this.internalSchema;
  }
}
