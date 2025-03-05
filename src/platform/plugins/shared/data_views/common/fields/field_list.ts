/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findIndex } from 'lodash';
import { DataViewField } from './data_view_field';
import { FieldSpec, DataViewFieldMap } from '../types';
import { DataView } from '../data_views';

type FieldMap = Map<DataViewField['name'], DataViewField>;

interface ToSpecOptions {
  getFormatterForField?: DataView['getFormatterForField'];
}

/**
 * Interface for data view field list which _extends_ the array class.
 */
export interface IIndexPatternFieldList extends Array<DataViewField> {
  /**
   * Creates a DataViewField instance. Does not add it to the data view.
   * @param field field spec to create field instance
   * @returns a new data view field instance
   */
  create(field: FieldSpec): DataViewField;
  /**
   * Add field to field list.
   * @param field field spec to add field to list
   * @returns data view field instance which was added to list
   */
  add(field: FieldSpec): DataViewField;
  /**
   * Returns fields as plain array of data view field instances.
   */
  getAll(): DataViewField[];
  /**
   * Get field by name. Optimized, uses map to find field.
   * @param name name of field to find
   * @returns data view field instance if found, undefined otherwise
   */
  getByName(name: DataViewField['name']): DataViewField | undefined;
  /**
   * Get fields by field type. Optimized, uses map to find fields.
   * @param type type of field to find
   * @returns array of data view field instances if found, empty array otherwise
   */
  getByType(type: DataViewField['type']): DataViewField[];
  /**
   * Remove field from field list
   * @param field field for removal
   */
  remove(field: DataViewField | FieldSpec): void;
  /**
   * Remove all fields from field list.
   */
  removeAll(): void;
  /**
   * Replace all fields in field list with new fields.
   * @param specs array of field specs to add to list
   */
  replaceAll(specs: FieldSpec[]): void;
  /**
   * Update a field in the list
   * @param field field spec to update
   */
  update(field: FieldSpec): void;
  /**
   * Field list as field spec map by name
   * @param options optionally provide a function to get field formatter for fields
   * @return map of field specs by name
   */
  toSpec(options?: ToSpecOptions): DataViewFieldMap;
}

// Extending the array class and using a constructor doesn't work well
// when calling filter and similar so wrapping in a callback.
// To be removed in the future
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
    private removeByGroup = (field: DataViewField) =>
      this.groups.get(field.type)?.delete(field.name);

    constructor() {
      super();
      specs.map((field) => this.add(field));
    }

    public readonly getAll = () => [...this.byName.values()];
    public readonly getByName = (name: DataViewField['name']) => this.byName.get(name);
    public readonly getByType = (type: DataViewField['type']) => [
      ...(this.groups.get(type) || new Map()).values(),
    ];

    public readonly create = (field: FieldSpec): DataViewField => {
      return new DataViewField({ ...field, shortDotsEnable });
    };

    public readonly add = (field: FieldSpec): DataViewField => {
      const newField = this.create(field);
      this.push(newField);
      this.setByName(newField);
      this.setByGroup(newField);
      return newField;
    };

    public readonly remove = (field: DataViewField) => {
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
