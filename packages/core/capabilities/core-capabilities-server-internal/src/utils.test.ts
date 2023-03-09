/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import { generateDelta } from './utils';

describe('generateDelta', () => {
  let capabilities: Capabilities;

  beforeEach(() => {
    capabilities = {
      navLinks: {},
      catalogue: {},
      management: {},
    };
  });

  it('generates the diff between the source and the changes', () => {
    capabilities = {
      ...capabilities,
      foo: {
        one: true,
        two: false,
      },
    };
    const delta = {
      foo: {
        one: false,
        two: true,
      },
    };

    expect(generateDelta(capabilities, delta)).toEqual({
      foo: {
        one: false,
        two: true,
      },
    });
  });

  it('evicts unmodified properties', () => {
    capabilities = {
      ...capabilities,
      foo: {
        one: true,
        two: false,
      },
      bar: {
        hello: true,
        dolly: false,
      },
    };
    const delta = {
      foo: {
        one: true,
        two: true,
      },
      bar: {
        hello: false,
        dolly: false,
      },
    };

    expect(generateDelta(capabilities, delta)).toEqual({
      foo: {
        two: true,
      },
      bar: {
        hello: false,
      },
    });
  });

  it('ignores props not present on the source', () => {
    capabilities = {
      ...capabilities,
      foo: {
        one: true,
        two: false,
      },
    };
    const delta = {
      foo: {
        one: true,
        two: true,
        three: false,
      },
    };

    expect(generateDelta(capabilities, delta)).toEqual({
      foo: {
        two: true,
      },
    });
  });
});
