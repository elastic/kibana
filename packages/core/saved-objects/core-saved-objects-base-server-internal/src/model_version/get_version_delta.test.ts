/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getModelVersionDelta } from './get_version_delta';

describe('getModelVersionDelta', () => {
  it('generates an upward delta', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: 1,
        b: 1,
      },
      targetVersions: {
        a: 2,
        b: 3,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('upward');
    expect(result.diff).toEqual([
      {
        name: 'a',
        current: 1,
        target: 2,
      },
      {
        name: 'b',
        current: 1,
        target: 3,
      },
    ]);
  });

  it('generates a downward delta', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: 4,
        b: 2,
      },
      targetVersions: {
        a: 1,
        b: 1,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('downward');
    expect(result.diff).toEqual([
      {
        name: 'a',
        current: 4,
        target: 1,
      },
      {
        name: 'b',
        current: 2,
        target: 1,
      },
    ]);
  });

  it('generates a noop delta', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: 4,
        b: 2,
      },
      targetVersions: {
        a: 4,
        b: 2,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('noop');
    expect(result.diff).toEqual([]);
  });

  it('ignores deleted types', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: 1,
        b: 3,
      },
      targetVersions: {
        a: 2,
      },
      deletedTypes: ['b'],
    });

    expect(result.status).toEqual('upward');
    expect(result.diff).toEqual([
      {
        name: 'a',
        current: 1,
        target: 2,
      },
    ]);
  });

  it('throws if the provided version maps are in conflict', () => {
    expect(() =>
      getModelVersionDelta({
        currentVersions: {
          a: 1,
          b: 2,
        },
        targetVersions: {
          a: 2,
          b: 1,
        },
        deletedTypes: [],
      })
    ).toThrow();
  });
});
