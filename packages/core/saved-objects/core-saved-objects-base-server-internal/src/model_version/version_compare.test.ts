/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compareModelVersions } from './version_compare';

describe('compareModelVersions', () => {
  it('returns the correct value for greater app version', () => {
    const result = compareModelVersions({
      appVersions: {
        foo: 3,
        bar: 2,
      },
      indexVersions: {
        foo: 2,
        bar: 2,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('greater');
  });

  it('returns the correct value for lesser app version', () => {
    const result = compareModelVersions({
      appVersions: {
        foo: 1,
        bar: 2,
      },
      indexVersions: {
        foo: 2,
        bar: 2,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('lesser');
  });

  it('returns the correct value for equal versions', () => {
    const result = compareModelVersions({
      appVersions: {
        foo: 2,
        bar: 2,
      },
      indexVersions: {
        foo: 2,
        bar: 2,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('equal');
  });

  it('handles new types not being present in the index', () => {
    const result = compareModelVersions({
      appVersions: {
        foo: 2,
        new: 1,
      },
      indexVersions: {
        foo: 2,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('greater');
  });

  it('handles types not being present in the app', () => {
    const result = compareModelVersions({
      appVersions: {
        foo: 3,
      },
      indexVersions: {
        foo: 2,
        old: 1,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('conflict');
  });

  it('returns the correct value for conflicts', () => {
    const result = compareModelVersions({
      appVersions: {
        a: 3,
        b: 3,
        c: 3,
      },
      indexVersions: {
        a: 2,
        b: 3,
        c: 4,
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('conflict');
  });

  it('properly lists the details', () => {
    const result = compareModelVersions({
      appVersions: {
        a: 3,
        b: 3,
        c: 3,
      },
      indexVersions: {
        a: 2,
        b: 3,
        c: 4,
      },
      deletedTypes: [],
    });

    expect(result.details.lesser).toEqual(['c']);
    expect(result.details.equal).toEqual(['b']);
    expect(result.details.greater).toEqual(['a']);
  });

  it('ignores deleted types when comparing', () => {
    const result = compareModelVersions({
      appVersions: {
        a: 3,
      },
      indexVersions: {
        a: 2,
        b: 3,
      },
      deletedTypes: ['b'],
    });

    expect(result.status).toEqual('greater');
  });
});
