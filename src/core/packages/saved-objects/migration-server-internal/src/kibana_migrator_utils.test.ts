/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_INDEX_TYPES_MAP } from '@kbn/core-saved-objects-base-server-internal';
import {
  calculateTypeStatuses,
  createWaitGroupMap,
  getIndicesInvolvedInRelocation,
  indexMapToIndexTypesMap,
} from './kibana_migrator_utils';
import { INDEX_MAP_BEFORE_SPLIT } from './kibana_migrator_utils.fixtures';

describe('createWaitGroupMap', () => {
  it('creates defer objects with the same Promise', () => {
    const defers = createWaitGroupMap(['.kibana', '.kibana_cases']);
    expect(Object.keys(defers)).toHaveLength(2);
    expect(defers['.kibana'].promise).toEqual(defers['.kibana_cases'].promise);
    expect(defers['.kibana'].resolve).not.toEqual(defers['.kibana_cases'].resolve);
    expect(defers['.kibana'].reject).not.toEqual(defers['.kibana_cases'].reject);
  });

  it('the common Promise resolves when all defers resolve', async () => {
    const defers = createWaitGroupMap(['.kibana', '.kibana_cases']);
    let resolved = 0;
    Object.values(defers).forEach((defer) => defer.promise.then(() => ++resolved));
    defers['.kibana'].resolve();
    await new Promise((resolve) => setImmediate(resolve)); // next tick
    expect(resolved).toEqual(0);
    defers['.kibana_cases'].resolve();
    await new Promise((resolve) => setImmediate(resolve)); // next tick
    expect(resolved).toEqual(2);
  });
});

describe('getIndicesInvolvedInRelocation', () => {
  it('returns the list of types that have moved to different indices', async () => {
    const indices = getIndicesInvolvedInRelocation(
      { '.my_index': ['testtype', 'testtype2', 'testtype3'], '.task_index': ['testtasktype'] },
      {
        '.my_index': ['testtype', 'testtype3'],
        '.other_index': ['testtype2'],
        '.task_index': ['testtasktype'],
      }
    );

    expect(indices).toEqual(['.my_index', '.other_index']);
  });
});

describe('indexMapToIndexTypesMap', () => {
  it('converts IndexMap to IndexTypesMap', () => {
    expect(indexMapToIndexTypesMap(INDEX_MAP_BEFORE_SPLIT)).toEqual(DEFAULT_INDEX_TYPES_MAP);
  });
});

describe('calculateTypeStatuses', () => {
  it('takes two indexTypesMaps and checks what types have been added, removed and relocated', () => {
    const currentIndexTypesMap = {
      '.indexA': ['type1', 'type2', 'type3'],
      '.indexB': ['type4', 'type5', 'type6'],
    };
    const desiredIndexTypesMap = {
      '.indexA': ['type2'],
      '.indexB': ['type3', 'type5'],
      '.indexC': ['type4', 'type6', 'type7'],
      '.indexD': ['type8'],
    };

    expect(calculateTypeStatuses(currentIndexTypesMap, desiredIndexTypesMap)).toEqual({
      type1: {
        currentIndex: '.indexA',
        status: 'removed',
      },
      type2: {
        currentIndex: '.indexA',
        status: 'untouched',
        targetIndex: '.indexA',
      },
      type3: {
        currentIndex: '.indexA',
        status: 'moved',
        targetIndex: '.indexB',
      },
      type4: {
        currentIndex: '.indexB',
        status: 'moved',
        targetIndex: '.indexC',
      },
      type5: {
        currentIndex: '.indexB',
        status: 'untouched',
        targetIndex: '.indexB',
      },
      type6: {
        currentIndex: '.indexB',
        status: 'moved',
        targetIndex: '.indexC',
      },
      type7: {
        status: 'added',
        targetIndex: '.indexC',
      },
      type8: {
        status: 'added',
        targetIndex: '.indexD',
      },
    });
  });
});
