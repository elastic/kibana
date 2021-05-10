/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsSerializer } from '../../serialization';
import { migrateRawDocs } from './migrate_raw_docs';

describe('migrateRawDocs', () => {
  test('converts raw docs to saved objects', async () => {
    const transform = jest.fn<any, any>((doc: any) => [
      set(_.cloneDeep(doc), 'attributes.name', 'HOI!'),
    ]);
    const result = await migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [
        { _id: 'a:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ]
    );

    expect(result).toEqual([
      {
        _id: 'a:b',
        _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
      },
      {
        _id: 'c:d',
        _source: { type: 'c', c: { name: 'HOI!' }, migrationVersion: {}, references: [] },
      },
    ]);

    const obj1 = {
      id: 'b',
      type: 'a',
      attributes: { name: 'AAA' },
      migrationVersion: {},
      references: [],
    };
    const obj2 = {
      id: 'd',
      type: 'c',
      attributes: { name: 'DDD' },
      migrationVersion: {},
      references: [],
    };
    expect(transform).toHaveBeenCalledTimes(2);
    expect(transform).toHaveBeenNthCalledWith(1, obj1);
    expect(transform).toHaveBeenNthCalledWith(2, obj2);
  });

  test('throws when encountering a corrupt saved object document', async () => {
    const transform = jest.fn<any, any>((doc: any) => [
      set(_.cloneDeep(doc), 'attributes.name', 'TADA'),
    ]);
    const result = migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [
        { _id: 'foo:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ]
    );

    expect(result).rejects.toMatchInlineSnapshot(
      `[Error: Unable to migrate the corrupt saved object document with _id: 'foo:b'.]`
    );

    expect(transform).toHaveBeenCalledTimes(0);
  });

  test('handles when one document is transformed into multiple documents', async () => {
    const transform = jest.fn<any, any>((doc: any) => [
      set(_.cloneDeep(doc), 'attributes.name', 'HOI!'),
      { id: 'bar', type: 'foo', attributes: { name: 'baz' } },
    ]);
    const result = await migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [{ _id: 'a:b', _source: { type: 'a', a: { name: 'AAA' } } }]
    );

    expect(result).toEqual([
      {
        _id: 'a:b',
        _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
      },
      {
        _id: 'foo:bar',
        _source: { type: 'foo', foo: { name: 'baz' }, references: [] },
      },
    ]);

    const obj = {
      id: 'b',
      type: 'a',
      attributes: { name: 'AAA' },
      migrationVersion: {},
      references: [],
    };
    expect(transform).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledWith(obj);
  });

  test('rejects when the transform function throws an error', async () => {
    const transform = jest.fn<any, any>((doc: any) => {
      throw new Error('error during transform');
    });
    await expect(
      migrateRawDocs(new SavedObjectsSerializer(new SavedObjectTypeRegistry()), transform, [
        { _id: 'a:b', _source: { type: 'a', a: { name: 'AAA' } } },
      ])
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error during transform"`);
  });
});
