/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getModelVersionDelta } from './get_version_delta';

describe('getModelVersionDelta', () => {
  it('generates an upward delta', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: '10.1.0',
        b: '10.1.0',
      },
      targetVersions: {
        a: '10.2.0',
        b: '10.3.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('upward');
    expect(result.diff).toEqual([
      {
        name: 'a',
        current: '10.1.0',
        target: '10.2.0',
      },
      {
        name: 'b',
        current: '10.1.0',
        target: '10.3.0',
      },
    ]);
  });

  it('accepts adding types for upward delta', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: '10.1.0',
      },
      targetVersions: {
        a: '10.2.0',
        b: '10.1.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('upward');
    expect(result.diff).toEqual([
      {
        name: 'a',
        current: '10.1.0',
        target: '10.2.0',
      },
      {
        name: 'b',
        current: undefined,
        target: '10.1.0',
      },
    ]);
  });

  it('generates a downward delta', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: '10.4.0',
        b: '10.2.0',
      },
      targetVersions: {
        a: '10.1.0',
        b: '7.17.2',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('downward');
    expect(result.diff).toEqual([
      {
        name: 'a',
        current: '10.4.0',
        target: '10.1.0',
      },
      {
        name: 'b',
        current: '10.2.0',
        target: '7.17.2',
      },
    ]);
  });

  it('accepts removing types for downward delta', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: '10.4.0',
        b: '10.2.0',
      },
      targetVersions: {
        a: '10.1.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('downward');
    expect(result.diff).toEqual([
      {
        name: 'a',
        current: '10.4.0',
        target: '10.1.0',
      },
      {
        name: 'b',
        current: '10.2.0',
        target: undefined,
      },
    ]);
  });

  it('generates a noop delta', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: '10.4.0',
        b: '8.9.2',
      },
      targetVersions: {
        a: '10.4.0',
        b: '8.9.2',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('noop');
    expect(result.diff).toEqual([]);
  });

  it('ignores deleted types', () => {
    const result = getModelVersionDelta({
      currentVersions: {
        a: '10.1.0',
        b: '10.3.0',
      },
      targetVersions: {
        a: '10.2.0',
      },
      deletedTypes: ['b'],
    });

    expect(result.status).toEqual('upward');
    expect(result.diff).toEqual([
      {
        name: 'a',
        current: '10.1.0',
        target: '10.2.0',
      },
    ]);
  });

  it('throws if the provided version maps are in conflict', () => {
    expect(() =>
      getModelVersionDelta({
        currentVersions: {
          a: '10.1.0',
          b: '10.2.0',
        },
        targetVersions: {
          a: '10.2.0',
          b: '10.1.0',
        },
        deletedTypes: [],
      })
    ).toThrow();
  });
});
