/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { applyConfigOverrides } from './serve';

describe('applyConfigOverrides', () => {
  it('merges empty objects to an empty config', () => {
    const output = applyConfigOverrides({}, {}, {});
    const defaultEmptyConfig = {
      plugins: {
        paths: [],
      },
    };

    expect(output).toEqual(defaultEmptyConfig);
  });

  it('merges objects', () => {
    const output = applyConfigOverrides(
      {
        tomato: {
          size: 40,
          color: 'red',
        },
      },
      {},
      {
        tomato: {
          weight: 100,
        },
      }
    );

    expect(output).toEqual({
      tomato: {
        weight: 100,
        color: 'red',
        size: 40,
      },
      plugins: {
        paths: [],
      },
    });
  });

  it('merges objects, but not arrays', () => {
    const output = applyConfigOverrides(
      {
        tomato: {
          color: 'red',
          arr: [1, 2, 3],
        },
      },
      {},
      {
        xyz: 40,
        tomato: {
          weight: 100,
          arr: [4, 5],
        },
      }
    );

    expect(output).toEqual({
      xyz: 40,
      tomato: {
        weight: 100,
        color: 'red',
        arr: [4, 5],
      },
      plugins: {
        paths: [],
      },
    });
  });
});
