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

import { deepFreeze } from '../../utils';
import { SavedObjectsType } from './types';

/**
 * @internal
 */
export class SavedObjectTypeRegistry {
  private types = new Map<string, SavedObjectsType>();

  public registerType(type: SavedObjectsType) {
    if (this.types.has(type.name)) {
      throw new Error(`Type '${type.name}' is already registered`);
    }
    this.types.set(type.name, deepFreeze(type));
  }

  public getType(type: string) {
    return this.types.get(type);
  }

  public getAllTypes() {
    return [...this.types.values()];
  }

  public isNamespaceAgnostic(type: string) {
    return this.types.get(type)?.namespaceAgnostic ?? false;
  }

  public isHidden(type: string) {
    return this.types.get(type)?.hidden ?? false;
  }

  public getIndex(type: string) {
    return this.types.get(type)?.indexPattern;
  }
}
