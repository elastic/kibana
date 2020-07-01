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
import { IIndexPattern } from '../../types';
import { IFieldType } from '../../../common';
import { Field } from './field';
import { OnNotification, FieldSpec } from '../types';
import { FieldFormatsStartCommon } from '../../field_formats';

type FieldMap = Map<Field['name'], Field>;

interface FieldListDependencies {
  fieldFormats: FieldFormatsStartCommon;
  onNotification: OnNotification;
}

export interface IIndexPatternFieldList extends Array<Field> {
  getByName(name: Field['name']): Field | undefined;
  getByType(type: Field['type']): Field[];
  add(field: FieldSpec): void;
  remove(field: IFieldType): void;
  update(field: FieldSpec): void;
}

export type CreateIndexPatternFieldList = (
  indexPattern: IIndexPattern,
  specs?: FieldSpec[],
  shortDotsEnable?: boolean
) => IIndexPatternFieldList;

export const getIndexPatternFieldListCreator = ({
  fieldFormats,
  onNotification,
}: FieldListDependencies): CreateIndexPatternFieldList => (...fieldListParams) => {
  class FieldList extends Array<Field> implements IIndexPatternFieldList {
    private byName: FieldMap = new Map();
    private groups: Map<Field['type'], FieldMap> = new Map();
    private indexPattern: IIndexPattern;
    private shortDotsEnable: boolean;
    private setByName = (field: Field) => this.byName.set(field.name, field);
    private setByGroup = (field: Field) => {
      if (typeof this.groups.get(field.type) === 'undefined') {
        this.groups.set(field.type, new Map());
      }
      this.groups.get(field.type)!.set(field.name, field);
    };
    private removeByGroup = (field: IFieldType) => this.groups.get(field.type)!.delete(field.name);

    constructor(indexPattern: IIndexPattern, specs: FieldSpec[] = [], shortDotsEnable = false) {
      super();
      this.indexPattern = indexPattern;
      this.shortDotsEnable = shortDotsEnable;

      specs.map((field) => this.add(field));
    }

    getByName = (name: Field['name']) => this.byName.get(name);
    getByType = (type: Field['type']) => [...(this.groups.get(type) || new Map()).values()];
    add = (field: FieldSpec) => {
      const newField = new Field(this.indexPattern, field, this.shortDotsEnable, {
        fieldFormats,
        onNotification,
      });
      this.push(newField);
      this.setByName(newField);
      this.setByGroup(newField);
    };

    remove = (field: IFieldType) => {
      this.removeByGroup(field);
      this.byName.delete(field.name);

      const fieldIndex = findIndex(this, { name: field.name });
      this.splice(fieldIndex, 1);
    };

    update = (field: FieldSpec) => {
      const newField = new Field(this.indexPattern, field, this.shortDotsEnable, {
        fieldFormats,
        onNotification,
      });
      const index = this.findIndex((f) => f.name === newField.name);
      this.splice(index, 1, newField);
      this.setByName(newField);
      this.removeByGroup(newField);
      this.setByGroup(newField);
    };

    toSpec = () => {
      return [...this.map((field) => field.toSpec())];
    };
  }

  return new FieldList(...fieldListParams);
};
