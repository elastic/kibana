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

export class FieldList extends Array<FieldType> {
  private byName: FieldMap = new Map();
  private groups: Map<Field['type'], FieldMap> = new Map();
  private indexPattern: IndexPattern;
  private shortDotsEnable: boolean;
  private notifications: NotificationsSetup;
  constructor(indexPattern: IndexPattern, specs: FieldSpec[] = [], shortDotsEnable = false, notifications: NotificationsSetup) {
    super();
    this.indexPattern = indexPattern;
    this.shortDotsEnable = shortDotsEnable;
    this.notifications = notifications;
    specs.map(field => this.add(field));
  }

  getByName = (name: Field['name']) => this.byName.get(name); // not used??
  getByType = (type: Field['type']) => [...(this.groups.get(type) || new Map()).values()];
  add = (field: FieldSpec) => {
    const newField = new Field(this.indexPattern, field, this.shortDotsEnable, this.notifications);
    this.push(newField);
    this.byName.set(newField.name, newField);

    // add to group, for speed
    if (typeof this.groups.get(field.type) === 'undefined') {
      this.groups.set(field.type, new Map());
    }
    (this.groups.get(field.type) as FieldMap).set(newField.name, newField);
  };

  remove = (field: FieldType) => {
    // maybe this just needs to take name
    (this.groups.get(field.type) as FieldMap).delete(field.name);
    this.byName.delete(field.name);

    const fieldIndex = findIndex(this, { name: field.name });
    this.splice(fieldIndex, 1);
  };
}
