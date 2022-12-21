/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExposedToBrowserDescriptor } from './types';

describe('ExposedToBrowserDescriptor', () => {
  interface ConfigType {
    str: string;
    array: number[];
    obj: {
      sub1: string;
      sub2: number;
    };
    deep: {
      foo: number;
      nested: {
        str: string;
        arr: number[];
      };
    };
  }

  it('allows to use recursion on objects', () => {
    const exposeToBrowser: ExposedToBrowserDescriptor<ConfigType> = {
      obj: {
        sub1: true,
      },
    };
    expect(exposeToBrowser).toBeDefined();
  });

  it('allows to use recursion at multiple levels', () => {
    const exposeToBrowser: ExposedToBrowserDescriptor<ConfigType> = {
      deep: {
        foo: true,
        nested: {
          str: true,
        },
      },
    };
    expect(exposeToBrowser).toBeDefined();
  });

  it('does not allow to use recursion on arrays', () => {
    const exposeToBrowser: ExposedToBrowserDescriptor<ConfigType> = {
      // @ts-expect-error Type '{ 0: true; }' is not assignable to type 'boolean | undefined'.
      array: {
        0: true,
      },
    };
    expect(exposeToBrowser).toBeDefined();
  });

  it('does not allow to use recursion on arrays at lower levels', () => {
    const exposeToBrowser: ExposedToBrowserDescriptor<ConfigType> = {
      deep: {
        nested: {
          // @ts-expect-error Type '{ 0: true; }' is not assignable to type 'boolean | undefined'.
          arr: {
            0: true,
          },
        },
      },
    };
    expect(exposeToBrowser).toBeDefined();
  });

  it('allows to specify all the properties', () => {
    const exposeToBrowser: ExposedToBrowserDescriptor<ConfigType> = {
      str: true,
      array: false,
      obj: {
        sub1: true,
      },
      deep: {
        foo: true,
        nested: {
          arr: false,
          str: true,
        },
      },
    };
    expect(exposeToBrowser).toBeDefined();
  });
});
