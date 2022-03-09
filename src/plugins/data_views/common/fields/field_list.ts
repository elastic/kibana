/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findIndex } from 'lodash';
import { IFieldType } from './types';
import { DataViewField } from './data_view_field';
import { FieldSpec, DataViewFieldMap } from '../types';
import { DataView } from '../data_views';

type FieldMap = Map<DataViewField['name'], DataViewField>;

export interface IIndexPatternFieldList extends Array<DataViewField> {
  add(field: FieldSpec): DataViewField;
  getAll(): DataViewField[];
  getByName(name: DataViewField['name']): DataViewField | undefined;
  getByType(type: DataViewField['type']): DataViewField[];
  remove(field: IFieldType): void;
  removeAll(): void;
  replaceAll(specs: FieldSpec[]): void;
  update(field: FieldSpec): void;
  toSpec(options?: { getFormatterForField?: DataView['getFormatterForField'] }): DataViewFieldMap;
}

// extending the array class and using a constructor doesn't work well
// when calling filter and similar so wrapping in a callback.
// to be removed in the future
export const fieldList = (
  specs: FieldSpec[] = [],
  shortDotsEnable = false
): IIndexPatternFieldList => {
  class FldList extends Array<DataViewField> implements IIndexPatternFieldList {
    private byName: FieldMap = new Map();
    private groups: Map<DataViewField['type'], FieldMap> = new Map();
    private setByName = (field: DataViewField) => this.byName.set(field.name, field);
    private setByGroup = (field: DataViewField) => {
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
    public readonly getByName = (name: DataViewField['name']) => this.byName.get(name);
    public readonly getByType = (type: DataViewField['type']) => [
      ...(this.groups.get(type) || new Map()).values(),
    ];
    public readonly add = (field: FieldSpec): DataViewField => {
      const newField = new DataViewField({ ...field, shortDotsEnable });
      this.push(newField);
      this.setByName(newField);
      this.setByGroup(newField);
      return newField;
    };

    public readonly remove = (field: IFieldType) => {
      this.removeByGroup(field);
      this.byName.delete(field.name);

      const fieldIndex = findIndex(this, { name: field.name });
      this.splice(fieldIndex, 1);
    };

    public readonly update = (field: FieldSpec) => {
      const newField = new DataViewField(field);
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
      getFormatterForField?: DataView['getFormatterForField'];
    } = {}) {
      return {
        ...this.reduce<DataViewFieldMap>((collector, field) => {
          collector[field.name] = field.toSpec({ getFormatterForField });
          return collector;
        }, {}),
      };
    }
  }

  return new FldList();
};
