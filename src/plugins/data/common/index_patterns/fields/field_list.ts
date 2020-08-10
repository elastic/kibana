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

import { IFieldType, shortenDottedString } from '../../../common';
import { IndexPatternField } from './index_pattern_field';
import { OnNotification, FieldSpec } from '../types';
import { IndexPattern } from '../index_patterns';

type FieldMap = Map<IndexPatternField['name'], IndexPatternField>;

/*
export interface IIndexPatternFieldList extends Array<IndexPatternField> {
  add(field: FieldSpec): void;
  getByName(name: IndexPatternField['name']): IndexPatternField | undefined;
  getByType(type: IndexPatternField['type']): IndexPatternField[];
  remove(field: IFieldType): void;
  removeAll(): void;
  replaceAll(specs: FieldSpec[]): void;
  update(field: FieldSpec): void;

}
*/

export class FieldList {
  private byName: FieldMap = new Map<IndexPatternField['name'], IndexPatternField>();
  private groups: Map<IndexPatternField['type'], FieldMap> = new Map();
  private indexPattern: IndexPattern;
  private shortDotsEnable: boolean;
  private onNotification: OnNotification;
  private setByName = (field: IndexPatternField) => this.byName.set(field.name, field);
  private setByGroup = (field: IndexPatternField) => {
    if (typeof this.groups.get(field.type) === 'undefined') {
      this.groups.set(field.type, new Map());
    }
    this.groups.get(field.type)!.set(field.name, field);
  };
  private removeByGroup = (field: IFieldType) => this.groups.get(field.type)!.delete(field.name);
  private calcDisplayName = (name: string) =>
    this.shortDotsEnable ? shortenDottedString(name) : name;
  constructor(
    indexPattern: IndexPattern,
    specs: FieldSpec[] = [],
    shortDotsEnable = false,
    onNotification = () => {}
  ) {
    this.indexPattern = indexPattern;
    this.shortDotsEnable = shortDotsEnable;
    this.onNotification = onNotification;

    specs.map((field) => this.add(field));
  }

  getAll = () => [...this.byName.values()];
  getByName = (name: IndexPatternField['name']) => this.byName.get(name);
  getByType = (type: IndexPatternField['type']) => [
    ...(this.groups.get(type) || new Map()).values(),
  ];
  add = (field: FieldSpec) => {
    const newField = new IndexPatternField(
      this.indexPattern,
      field,
      this.calcDisplayName(field.name),
      this.onNotification
    );
    this.setByName(newField);
    this.setByGroup(newField);
  };

  remove = (field: IFieldType) => {
    this.removeByGroup(field);
    this.byName.delete(field.name);
  };

  update = (field: FieldSpec) => {
    const newField = new IndexPatternField(
      this.indexPattern,
      field,
      this.calcDisplayName(field.name),
      this.onNotification
    );
    this.setByName(newField);
    this.removeByGroup(newField);
    this.setByGroup(newField);
  };

  removeAll = () => {
    this.byName.clear();
    this.groups.clear();
  };

  replaceAll = (specs: FieldSpec[]) => {
    this.removeAll();
    specs.forEach(this.add);
  };

  toSpec = () => {
    return [...this.byName.values()].map((field) => field.toSpec());
  };
}
