/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsSerializer } from '../../serialization';
import { migrateRawDocs } from './migrate_raw_docs';
import { createSavedObjectsMigrationLoggerMock } from '../../migrations/mocks';

describe('migrateRawDocs', () => {
  test('converts raw docs to saved objects', async () => {
    const transform = jest.fn<any, any>((doc: any) => set(doc, 'attributes.name', 'HOI!'));
    const result = await migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [
        { _id: 'a:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ],
      createSavedObjectsMigrationLoggerMock()
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

    expect(transform).toHaveBeenCalled();
  });

  test('passes invalid docs through untouched and logs error', async () => {
    const logger = createSavedObjectsMigrationLoggerMock();
    const transform = jest.fn<any, any>((doc: any) =>
      set(_.cloneDeep(doc), 'attributes.name', 'TADA')
    );
    const result = await migrateRawDocs(
      new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
      transform,
      [
        { _id: 'foo:b', _source: { type: 'a', a: { name: 'AAA' } } },
        { _id: 'c:d', _source: { type: 'c', c: { name: 'DDD' } } },
      ],
      logger
    );

    expect(result).toEqual([
      { _id: 'foo:b', _source: { type: 'a', a: { name: 'AAA' } } },
      {
        _id: 'c:d',
        _source: { type: 'c', c: { name: 'TADA' }, migrationVersion: {}, references: [] },
      },
    ]);

    expect(transform.mock.calls).toEqual([
      [
        {
          id: 'd',
          type: 'c',
          attributes: {
            name: 'DDD',
          },
          migrationVersion: {},
          references: [],
        },
      ],
    ]);

    expect(logger.error).toBeCalledTimes(1);
  });

  test('rejects when the transform function throws an error', async () => {
    const transform = jest.fn<any, any>((doc: any) => {
      throw new Error('error during transform');
    });
    await expect(
      migrateRawDocs(
        new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
        transform,
        [{ _id: 'a:b', _source: { type: 'a', a: { name: 'AAA' } } }],
        createSavedObjectsMigrationLoggerMock()
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error during transform"`);
  });
});
