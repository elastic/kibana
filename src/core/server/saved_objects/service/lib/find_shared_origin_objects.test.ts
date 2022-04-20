/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';

import type { CreatePointInTimeFinderFn, PointInTimeFinder } from './point_in_time_finder';
import { savedObjectsPointInTimeFinderMock } from './point_in_time_finder.mock';
import type { ISavedObjectsRepository } from './repository';
import { savedObjectsRepositoryMock } from './repository.mock';
import { findSharedOriginObjects } from './find_shared_origin_objects';

interface MockFindResultParams {
  type: string;
  id: string;
  originId?: string;
  namespaces: string[];
}

describe('findSharedOriginObjects', () => {
  let savedObjectsMock: jest.Mocked<ISavedObjectsRepository>;
  let pointInTimeFinder: DeeplyMockedKeys<PointInTimeFinder>;
  let createPointInTimeFinder: jest.MockedFunction<CreatePointInTimeFinderFn>;

  beforeEach(() => {
    savedObjectsMock = savedObjectsRepositoryMock.create();
    savedObjectsMock.find.mockResolvedValue({
      pit_id: 'foo',
      saved_objects: [],
      // the rest of these fields don't matter but are included for type safety
      total: 0,
      page: 1,
      per_page: 100,
    });
    pointInTimeFinder = savedObjectsPointInTimeFinderMock.create({ savedObjectsMock })(); // PIT finder mock uses the actual implementation, but it doesn't need to be created with real params because the SOR is mocked too
    createPointInTimeFinder = jest.fn().mockReturnValue(pointInTimeFinder);
  });

  function mockFindResults(...results: MockFindResultParams[]) {
    savedObjectsMock.find.mockResolvedValueOnce({
      pit_id: 'foo',
      saved_objects: results.map(({ type, id, originId, namespaces }) => ({
        type,
        id,
        namespaces,
        ...(originId && { originId }),
        attributes: {},
        references: [],
        score: 0, // doesn't matter
      })),
      // the rest of these fields don't matter but are included for type safety
      total: 0,
      page: 1,
      per_page: 100,
    });
  }

  const obj1 = { type: 'type-1', origin: 'id-1' };
  const obj2 = { type: 'type-2', origin: 'id-2' };
  const obj3 = { type: 'type-3', origin: 'id-3' };
  const obj4 = { type: 'type-4', origin: 'id-4' };

  it('uses the PointInTimeFinder to search for legacy URL aliases', async () => {
    mockFindResults(
      { type: 'type-1', id: 'id-1', namespaces: ['space-a', 'space-b'] },
      { type: 'type-1', id: 'id-x', originId: 'id-1', namespaces: ['space-b', 'space-c'] },
      { type: 'type-2', id: 'id-2', namespaces: ['*', 'space-d'] },
      { type: 'type-2', id: 'id-y', originId: 'id-2', namespaces: ['space-e'] },
      { type: 'type-3', id: 'id-3', namespaces: ['f'] },
      { type: 'type-3', id: 'id-z', originId: 'id-3', namespaces: ['*', 'space-g'] }
      // no results matching obj4
    );

    const objects = [obj1, obj2, obj3, obj4];
    const result = await findSharedOriginObjects(createPointInTimeFinder, objects);
    expect(createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({ type: ['type-1', 'type-2', 'type-3', 'type-4'] }) // filter assertions are below
    );
    const kueryFilterArgs = createPointInTimeFinder.mock.calls[0][0].filter.arguments;
    expect(kueryFilterArgs).toHaveLength(8); // 2 for each object
    [obj1, obj2, obj3].forEach(({ type, origin }, i) => {
      expect(kueryFilterArgs[i * 2].arguments).toEqual(
        expect.arrayContaining([
          { type: 'literal', value: `${type}.id` },
          { type: 'literal', value: `${type}:${origin}` },
        ])
      );
      expect(kueryFilterArgs[i * 2 + 1].arguments).toEqual(
        expect.arrayContaining([
          { type: 'literal', value: `${type}.originId` },
          { type: 'literal', value: origin },
        ])
      );
    });
    expect(pointInTimeFinder.find).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.close).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      // This contains multiple assertions about the response:
      // 1. A match's `id` is ignored if it has a defined `originId`
      // 2. The `namespaces` from different matches are combined into a single set, and duplicate space IDs are filtered out
      // 3. If the first match's `namespaces` array contains '*', all other space IDs are filtered out
      // 4. If the last match's `namespaces` array contains '*', all other space IDs are filtered out
      // 5. Objects that have no matches will not have an entry in the result map
      new Map([
        ['type-1:id-1', new Set(['space-a', 'space-b', 'space-c'])],
        ['type-2:id-2', new Set(['*'])],
        ['type-3:id-3', new Set(['*'])],
        // the result map does not contain keys for obj4 because we did not find any matches for that object
      ])
    );
  });

  it('allows perPage to be set', async () => {
    const objects = [obj1, obj2, obj3];
    await findSharedOriginObjects(createPointInTimeFinder, objects, 999);
    expect(createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(createPointInTimeFinder).toHaveBeenCalledWith(expect.objectContaining({ perPage: 999 }));
  });

  it('does not create a PointInTimeFinder if no objects are passed in', async () => {
    await findSharedOriginObjects(createPointInTimeFinder, []);
    expect(createPointInTimeFinder).not.toHaveBeenCalled();
  });

  it('handles PointInTimeFinder.find errors', async () => {
    savedObjectsMock.find.mockRejectedValue(new Error('Oh no!'));

    const objects = [obj1, obj2, obj3];
    await expect(() => findSharedOriginObjects(createPointInTimeFinder, objects)).rejects.toThrow(
      'Failed to retrieve shared origin objects: Oh no!'
    );
    expect(createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.find).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.close).toHaveBeenCalledTimes(2); // we still close the point-in-time, even though the search failed
  });

  it('handles PointInTimeFinder.close errors', async () => {
    pointInTimeFinder.close.mockRejectedValue(new Error('Oh no!'));

    const objects = [obj1, obj2, obj3];
    await expect(() => findSharedOriginObjects(createPointInTimeFinder, objects)).rejects.toThrow(
      'Failed to retrieve shared origin objects: Oh no!'
    );
    expect(createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.find).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.close).toHaveBeenCalledTimes(2);
  });
});
