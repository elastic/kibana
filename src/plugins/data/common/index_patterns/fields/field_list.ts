/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { findIndex } from 'lodash';
import { IFieldType } from './types';
import { IndexPatternField } from './index_pattern_field';
import { FieldSpec, IndexPatternFieldMap } from '../types';
import { IndexPattern } from '../index_patterns';

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
  toSpec(options?: {
    getFormatterForField?: IndexPattern['getFormatterForField'];
  }): IndexPatternFieldMap;
}

// extending the array class and using a constructor doesn't work well
// when calling filter and similar so wrapping in a callback.
// to be removed in the future
export const fieldList = (
  specs: FieldSpec[] = [],
  shortDotsEnable = false
): IIndexPatternFieldList => {
  class FldList extends Array<IndexPatternField> implements IIndexPatternFieldList {
    private byName: FieldMap = new Map();
    private groups: Map<IndexPatternField['type'], FieldMap> = new Map();
    private setByName = (field: IndexPatternField) => this.byName.set(field.name, field);
    private setByGroup = (field: IndexPatternField) => {
      if (typeof this.groups.get(field.type) === 'undefined') {
        this.groups.set(field.type, new Map());
      }
      this.groups.get(field.type)!.set(field.name, field);
    };
    private removeByGroup = (field: IFieldType) => this.groups.get(field.type)!.delete(field.name);

    constructor() {
      super();
      specs.map((field) => this.add(field));
    }

    public readonly getAll = () => [...this.byName.values()];
    public readonly getByName = (name: IndexPatternField['name']) => this.byName.get(name);
    public readonly getByType = (type: IndexPatternField['type']) => [
      ...(this.groups.get(type) || new Map()).values(),
    ];
    public readonly add = (field: FieldSpec) => {
      const newField = new IndexPatternField({ ...field, shortDotsEnable });
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
      const newField = new IndexPatternField(field);
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

    public readonly replaceAll = (spcs: FieldSpec[] = []) => {
      this.removeAll();
      spcs.forEach(this.add);
    };

    public toSpec({
      getFormatterForField,
    }: {
      getFormatterForField?: IndexPattern['getFormatterForField'];
    } = {}) {
      return {
        ...this.reduce<IndexPatternFieldMap>((collector, field) => {
          collector[field.name] = field.toSpec({ getFormatterForField });
          return collector;
        }, {}),
      };
    }
  }

  return new FldList();
};
