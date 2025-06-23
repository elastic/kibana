/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldList, IIndexPatternFieldList } from './field_list';
import { DataViewField } from './data_view_field';
import type { FieldSpec } from '../types';

const baseField: FieldSpec = {
  name: 'foo',
  type: 'string',
  esTypes: ['keyword'],
  aggregatable: true,
  searchable: true,
  scripted: false,
};

const anotherField: FieldSpec = {
  name: 'bar',
  type: 'number',
  esTypes: ['long'],
  aggregatable: false,
  searchable: false,
  scripted: false,
  count: 5,
  customLabel: 'Bar Label',
  customDescription: 'Bar Description',
  conflictDescriptions: { idx1: ['type1', 'type2'] },
  readFromDocValues: true,
  indexed: true,
  isMapped: true,
};

const scriptedField: FieldSpec = {
  name: 'scripted',
  type: 'number',
  esTypes: ['long'],
  aggregatable: false,
  searchable: false,
  scripted: true,
  script: 'doc["bar"].value + 1',
  lang: 'painless',
};

describe('fieldList', () => {
  let list: IIndexPatternFieldList;

  beforeEach(() => {
    list = fieldList([baseField], false);
  });

  it('creates a field list with initial fields', () => {
    expect(list.length).toBe(1);
    expect(list[0]).toBeInstanceOf(DataViewField);
    expect(list[0].name).toBe('foo');
    expect(list[0].type).toBe('string');
    expect(list[0].esTypes).toEqual(['keyword']);
    expect(list[0].aggregatable).toBe(true);
    expect(list[0].searchable).toBe(true);
    expect(list[0].scripted).toBe(false);
  });

  it('creates a DataViewField instance with create()', () => {
    const field = list.create(anotherField);
    expect(field).toBeInstanceOf(DataViewField);
    expect(field.name).toBe('bar');
    expect(field.type).toBe('number');
    expect(field.customLabel).toBe('Bar Label');
    expect(field.customDescription).toBe('Bar Description');
    expect(field.conflictDescriptions).toEqual({ idx1: ['type1', 'type2'] });
    expect(field.count).toBe(5);
    expect(field.readFromDocValues).toBe(true);
    expect(field.isMapped).toBe(true);
  });

  it('adds a field with add()', () => {
    const added = list.add(anotherField);
    expect(list.length).toBe(2);
    expect(list.getByName('bar')).toBe(added);
    expect(list.getByType('number')).toContain(added);
    expect(list.getByType('string')[0].name).toBe('foo');
  });

  it('gets all fields with getAll()', () => {
    list.add(anotherField);
    const all = list.getAll();
    expect(all.length).toBe(2);
    expect(all[0]).toBeInstanceOf(DataViewField);
    expect(all[1]).toBeInstanceOf(DataViewField);
    expect(all.map((f) => f.name)).toEqual(['foo', 'bar']);
  });

  it('gets a field by name with getByName()', () => {
    expect(list.getByName('foo')).toBeInstanceOf(DataViewField);
    expect(list.getByName('foo')?.name).toBe('foo');
    expect(list.getByName('notfound')).toBeUndefined();
  });

  it('gets fields by type with getByType()', () => {
    list.add(anotherField);
    const stringFields = list.getByType('string');
    expect(stringFields.length).toBe(1);
    expect(stringFields[0].name).toBe('foo');
    const numberFields = list.getByType('number');
    expect(numberFields.length).toBe(1);
    expect(numberFields[0].name).toBe('bar');
    const notFound = list.getByType('boolean');
    expect(notFound.length).toBe(0);
  });

  it('removes a field with remove()', () => {
    const field = list.getByName('foo');
    if (field) {
      list.remove(field);
    }
    expect(list.length).toBe(0);
    expect(list.getByName('foo')).toBeUndefined();
    expect(list.getByType('string').length).toBe(0);
  });

  it('updates a field with update()', () => {
    list.add(anotherField);
    const updatedField: FieldSpec = {
      ...anotherField,
      aggregatable: true,
      name: 'bar',
      customLabel: 'Updated Label',
    };
    list.update(updatedField);
    const field = list.getByName('bar');
    expect(field).toBeInstanceOf(DataViewField);
    expect(field?.aggregatable).toBe(true);
    expect(field?.customLabel).toBe('Updated Label');
  });

  it('removes all fields with removeAll()', () => {
    list.add(anotherField);
    list.removeAll();
    expect(list.length).toBe(0);
    expect(list.getAll().length).toBe(0);
    expect(list.getByName('foo')).toBeUndefined();
    expect(list.getByType('string').length).toBe(0);
  });

  it('replaces all fields with replaceAll()', () => {
    list.replaceAll([anotherField, scriptedField]);
    expect(list.length).toBe(2);
    expect(list[0].name).toBe('bar');
    expect(list[1].name).toBe('scripted');
    expect(list.getByName('foo')).toBeUndefined();
    expect(list.getByName('bar')).toBeInstanceOf(DataViewField);
    expect(list.getByName('scripted')).toBeInstanceOf(DataViewField);
    expect(list.getByName('scripted')?.scripted).toBe(true);
    expect(list.getByName('scripted')?.script).toBe('doc["bar"].value + 1');
    expect(list.getByName('scripted')?.lang).toBe('painless');
  });

  it('caches and clears toSpec()', () => {
    const spy = jest.spyOn(list[0], 'toSpec');
    // First call, not cached
    const spec1 = list.toSpec();
    expect(spec1.foo).toBeDefined();
    expect(spy).toHaveBeenCalled();

    // Second call, should be cached (no new calls to toSpec)
    spy.mockClear();
    const spec2 = list.toSpec();
    expect(spec2.foo).toBeDefined();
    expect(spy).not.toHaveBeenCalled();

    // After add, cache should be cleared
    list.add(anotherField);
    const spec3 = list.toSpec();
    expect(spec3.bar).toBeDefined();
  });

  it('calls toSpec with getFormatterForField', () => {
    const getFormatterForField = jest.fn().mockReturnValue({ toJSON: () => ({ id: 'test' }) });
    list.toSpec({ getFormatterForField });
    expect(getFormatterForField).toHaveBeenCalledWith(list[0]);
  });

  it('handles remove on non-existent field gracefully', () => {
    expect(list.length).toBe(1);
    const fakeField = new DataViewField({ ...baseField, name: 'notfound' });
    expect(() => list.remove(fakeField)).not.toThrow();
    expect(list.length).toBe(1);
  });

  it('handles update on non-existent field gracefully', () => {
    const fakeField: FieldSpec = { ...baseField, name: 'notfound' };
    expect(() => list.update(fakeField)).not.toThrow();
    expect(list.length).toBe(1);
  });

  it('handles replaceAll with empty array', () => {
    list.replaceAll([]);
    expect(list.length).toBe(0);
  });

  it('supports adding and updating a scripted field', () => {
    list.add(scriptedField);
    const field = list.getByName('scripted');
    expect(field).toBeInstanceOf(DataViewField);
    expect(field?.scripted).toBe(true);
    expect(field?.script).toBe('doc["bar"].value + 1');
    expect(field?.lang).toBe('painless');

    // Update scripted field
    const updatedScripted: FieldSpec = {
      ...scriptedField,
      script: 'doc["bar"].value + 2',
      lang: 'expression',
    };
    list.update(updatedScripted);
    const updated = list.getByName('scripted');
    expect(updated?.script).toBe('doc["bar"].value + 2');
    expect(updated?.lang).toBe('expression');
  });

  it('does not throw if remove is called on a field not in the list', () => {
    const field = new DataViewField({ ...baseField, name: 'notfound' });
    expect(() => list.remove(field)).not.toThrow();
  });

  it('does not throw if update is called on a field not in the list', () => {
    const field: FieldSpec = { ...baseField, name: 'notfound' };
    expect(() => list.update(field)).not.toThrow();
  });

  it('preserves shortDotsEnable option', () => {
    const shortDotsList = fieldList([baseField], true);
    expect(shortDotsList[0].spec.shortDotsEnable).toBe(true);
  });

  it('does not fail if add is called with a field with the same name', () => {
    list.add(baseField);
    expect(list.length).toBe(2);
    expect(list[0].name).toBe('foo');
    expect(list[1].name).toBe('foo');
  });
});
