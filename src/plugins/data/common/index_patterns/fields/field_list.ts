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

import { findIndex } from 'lodash';
import { IFieldType } from './types';
import { IndexPatternField } from './index_pattern_field';
import { OnNotification, FieldSpec } from '../types';
import { IndexPattern } from '../index_patterns';
import { shortenDottedString } from '../../utils';

type FieldMap = Map<IndexPatternField['name'], IndexPatternField>;

export interface IIndexPatternFieldList extends Array<IndexPatternField> {
  add(field: FieldSpec): void;
  getAll(): IndexPatternField[];
  getByName(name: IndexPatternField['name']): IndexPatternField | undefined;
  getByType(type: IndexPatternField['type']): IndexPatternField[];
  remove(field: IFieldType): void;
  removeAll(): void;
  replaceAll(specs: FieldSpec[]): void;
  update(field: FieldSpec): void;
}

export type CreateIndexPatternFieldList = (
  indexPattern: IndexPattern,
  specs?: FieldSpec[],
  shortDotsEnable?: boolean,
  onNotification?: OnNotification
) => IIndexPatternFieldList;

export class FieldList extends Array<IndexPatternField> implements IIndexPatternFieldList {
  private byName: FieldMap = new Map();
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
    onNotification: OnNotification = () => {}
  ) {
    super();
    this.indexPattern = indexPattern;
    this.shortDotsEnable = shortDotsEnable;
    this.onNotification = onNotification;

    specs.map((field) => this.add(field));
  }

  public readonly getAll = () => [...this.byName.values()];
  public readonly getByName = (name: IndexPatternField['name']) => this.byName.get(name);
  public readonly getByType = (type: IndexPatternField['type']) => [
    ...(this.groups.get(type) || new Map()).values(),
  ];
  public readonly add = (field: FieldSpec) => {
    const newField = new IndexPatternField(
      this.indexPattern,
      field,
      this.calcDisplayName(field.name),
      this.onNotification
    );
    this.push(newField);
    this.setByName(newField);
    this.setByGroup(newField);
  };

  public readonly remove = (field: IFieldType) => {
    this.removeByGroup(field);
    this.byName.delete(field.name);

    const fieldIndex = findIndex(this, { name: field.name });
    this.splice(fieldIndex, 1);
  };

  public readonly update = (field: FieldSpec) => {
    const newField = new IndexPatternField(
      this.indexPattern,
      field,
      this.calcDisplayName(field.name),
      this.onNotification
    );
    const index = this.findIndex((f) => f.name === newField.name);
    this.splice(index, 1, newField);
    this.setByName(newField);
    this.removeByGroup(newField);
    this.setByGroup(newField);
  };

  public readonly removeAll = () => {
    this.length = 0;
    this.byName.clear();
    this.groups.clear();
  };

  public readonly replaceAll = (specs: FieldSpec[]) => {
    this.removeAll();
    specs.forEach(this.add);
  };

  public readonly toSpec = () => {
    return [...this.map((field) => field.toSpec())];
  };
}
