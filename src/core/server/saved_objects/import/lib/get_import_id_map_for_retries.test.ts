/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '../../types';
import type { SavedObjectsImportRetry } from '../types';
import { getImportIdMapForRetries } from './get_import_id_map_for_retries';

describe('#getImportIdMapForRetries', () => {
  const createRetry = (
    { type, id }: { type: string; id: string },
    params: { destinationId?: string; createNewCopy?: boolean } = {}
  ): SavedObjectsImportRetry => {
    const { destinationId, createNewCopy } = params;
    return { type, id, overwrite: false, destinationId, replaceReferences: [], createNewCopy };
  };

  test('throws an error if retry is not found for an object', async () => {
    const obj1 = { type: 'type-1', id: 'id-1' };
    const obj2 = { type: 'type-2', id: 'id-2' };
    const objects = [obj1, obj2] as SavedObject[];
    const retries = [createRetry(obj1)];
    const params = { objects, retries, createNewCopies: false };

    expect(() => getImportIdMapForRetries(params)).toThrowErrorMatchingInlineSnapshot(
      `"Retry was expected for \\"type-2:id-2\\" but not found"`
    );
  });

  test('returns expected results', async () => {
    const obj1 = { type: 'type-1', id: 'id-1' };
    const obj2 = { type: 'type-2', id: 'id-2' };
    const obj3 = { type: 'type-3', id: 'id-3' };
    const obj4 = { type: 'type-4', id: 'id-4' };
    const objects = [obj1, obj2, obj3, obj4] as SavedObject[];
    const retries = [
      createRetry(obj1), // retries that do not have `destinationId` specified are ignored
      createRetry(obj2, { destinationId: obj2.id }), // retries that have `id` that matches `destinationId` are ignored
      createRetry(obj3, { destinationId: 'id-X' }), // this retry will get added to the `importIdMap`!
      createRetry(obj4, { destinationId: 'id-Y', createNewCopy: true }), // this retry will get added to the `importIdMap`!
    ];
    const params = { objects, retries, createNewCopies: false };

    const result = await getImportIdMapForRetries(params);
    expect(result).toEqual(
      new Map([
        [`${obj3.type}:${obj3.id}`, { id: 'id-X', omitOriginId: false }],
        [`${obj4.type}:${obj4.id}`, { id: 'id-Y', omitOriginId: true }],
      ])
    );
  });

  test('omits origin ID in `importIdMap` entries when createNewCopies=true', async () => {
    const obj1 = { type: 'type-1', id: 'id-1' };
    const objects = [obj1] as SavedObject[];
    const retries = [createRetry(obj1, { destinationId: 'id-X' })];
    const params = { objects, retries, createNewCopies: true };

    const result = await getImportIdMapForRetries(params);
    expect(result).toEqual(
      new Map([[`${obj1.type}:${obj1.id}`, { id: 'id-X', omitOriginId: true }]])
    );
  });
});
