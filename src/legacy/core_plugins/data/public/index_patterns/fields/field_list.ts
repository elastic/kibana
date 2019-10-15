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

import { NotificationsSetup } from 'kibana/public';
import { findIndex } from 'lodash';
import { IndexPattern } from '../index_patterns';
import { Field, FieldType, FieldSpec } from './field';

type FieldMap = Map<Field['name'], Field>;

export interface FieldListInterface extends Array<Field> {
  getByName(name: Field['name']): Field | undefined;
  getByType(type: Field['type']): Field[];
  add(field: FieldSpec): void;
  remove(field: FieldType): void;
}

// placing private variables and functions in function scope because `private` methods compile to public 😭
export function fieldList(
  indexPattern: IndexPattern,
  specs: FieldSpec[] = [],
  shortDotsEnable = false,
  notifications: NotificationsSetup
) {
  const byName: FieldMap = new Map();
  const groups: Map<Field['type'], FieldMap> = new Map();

  const setByName = (field: Field) => byName.set(field.name, field);
  const setByGroup = (field: Field) => {
    if (typeof groups.get(field.type) === 'undefined') {
      groups.set(field.type, new Map());
    }
    groups.get(field.type)!.set(field.name, field);
  };
  const removeByGroup = (field: FieldType) => groups.get(field.type)!.delete(field.name);

  class FieldListClass extends Array<Field> implements FieldListInterface {
    constructor() {
      super();
      specs.map(field => this.add(field));
    }

    getByName = (name: Field['name']) => {
      // console.log('getByName', name, byName.size);
      return byName.get(name)
    };
    getByType = (type: Field['type']) => [...(groups.get(type) || new Map()).values()];
    add = (field: FieldSpec) => {
      const newField = new Field(indexPattern, field, shortDotsEnable, notifications);
      this.push(newField);
      setByName(newField);
      setByGroup(newField);
    };

    remove = (field: FieldType) => {
      removeByGroup(field);
      byName.delete(field.name);

      const fieldIndex = findIndex(this, { name: field.name });
      this.splice(fieldIndex, 1);
    };

    update = (field: Field) => {
      const index = this.findIndex(f => f.name === field.name);
      this.splice(index, 1, field);
      setByName(field);
      removeByGroup(field);
      setByGroup(field);
    };
  }

  return new FieldListClass();
}
