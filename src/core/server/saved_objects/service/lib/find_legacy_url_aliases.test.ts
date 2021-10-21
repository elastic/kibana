/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';

import { LegacyUrlAlias, LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import { findLegacyUrlAliases } from './find_legacy_url_aliases';
import type { CreatePointInTimeFinderFn, PointInTimeFinder } from './point_in_time_finder';
import { savedObjectsPointInTimeFinderMock } from './point_in_time_finder.mock';
import type { ISavedObjectsRepository } from './repository';
import { savedObjectsRepositoryMock } from './repository.mock';

describe('findLegacyUrlAliases', () => {
  let savedObjectsMock: jest.Mocked<ISavedObjectsRepository>;
  let createPointInTimeFinder: jest.MockedFunction<CreatePointInTimeFinderFn>;
  let pointInTimeFinder: DeeplyMockedKeys<PointInTimeFinder>;

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
    createPointInTimeFinder = jest.fn();
    createPointInTimeFinder.mockImplementation((params) => {
      pointInTimeFinder = savedObjectsPointInTimeFinderMock.create({ savedObjectsMock })(params);
      return pointInTimeFinder;
    });
  });

  function mockFindResults(...results: LegacyUrlAlias[]) {
    savedObjectsMock.find.mockResolvedValueOnce({
      pit_id: 'foo',
      saved_objects: results.map((attributes) => ({
        id: 'doesnt-matter',
        type: LEGACY_URL_ALIAS_TYPE,
        attributes,
        references: [],
        score: 0, // doesn't matter
      })),
      // the rest of these fields don't matter but are included for type safety
      total: 0,
      page: 1,
      per_page: 100,
    });
  }

  const obj1 = { type: 'obj-type', id: 'id-1' };
  const obj2 = { type: 'obj-type', id: 'id-2' };
  const obj3 = { type: 'obj-type', id: 'id-3' };

  it('uses the PointInTimeFinder to search for legacy URL aliases', async () => {
    mockFindResults(
      // mock search results for four aliases for obj1, and none for obj2 or obj3
      ...[1, 2, 3, 4].map((i) => ({
        sourceId: obj1.id,
        targetId: 'doesnt-matter',
        targetType: obj1.type,
        targetNamespace: `space-${i}`,
      }))
    );

    const objects = [obj1, obj2, obj3];
    const result = await findLegacyUrlAliases(createPointInTimeFinder, objects);
    expect(createPointInTimeFinder).toHaveBeenCalledTimes(1);
    const kueryFilterArgs = createPointInTimeFinder.mock.calls[0][0].filter.arguments;
    expect(kueryFilterArgs).toHaveLength(2);
    const typeAndIdFilters = kueryFilterArgs[1].arguments;
    expect(typeAndIdFilters).toHaveLength(3);
    [obj1, obj2, obj3].forEach(({ type, id }, i) => {
      const typeAndIdFilter = typeAndIdFilters[i].arguments;
      expect(typeAndIdFilter).toEqual([
        expect.objectContaining({
          arguments: expect.arrayContaining([{ type: 'literal', value: type }]),
        }),
        expect.objectContaining({
          arguments: expect.arrayContaining([{ type: 'literal', value: id }]),
        }),
      ]);
    });
    expect(pointInTimeFinder.find).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.close).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      new Map([
        [`${obj1.type}:${obj1.id}`, new Set(['space-1', 'space-2', 'space-3', 'space-4'])],
        // the result map does not contain keys for obj2 or obj3 because we did not find any aliases for those objects
      ])
    );
  });

  it('does not create a PointInTimeFinder if no objects are passed in', async () => {
    await findLegacyUrlAliases(createPointInTimeFinder, []);
    expect(createPointInTimeFinder).not.toHaveBeenCalled();
  });

  it('handles PointInTimeFinder.find errors', async () => {
    savedObjectsMock.find.mockRejectedValue(new Error('Oh no!'));

    const objects = [obj1, obj2, obj3];
    await expect(() => findLegacyUrlAliases(createPointInTimeFinder, objects)).rejects.toThrow(
      'Failed to retrieve legacy URL aliases: Oh no!'
    );
    expect(createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.find).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.close).toHaveBeenCalledTimes(2); // we still close the point-in-time, even though the search failed
  });

  it('handles PointInTimeFinder.close errors', async () => {
    savedObjectsMock.closePointInTime.mockRejectedValue(new Error('Oh no!'));

    const objects = [obj1, obj2, obj3];
    await expect(() => findLegacyUrlAliases(createPointInTimeFinder, objects)).rejects.toThrow(
      'Failed to retrieve legacy URL aliases: Oh no!'
    );
    expect(createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.find).toHaveBeenCalledTimes(1);
    expect(pointInTimeFinder.close).toHaveBeenCalledTimes(2);
  });
});
