/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compareVirtualVersions } from './version_compare';

describe('compareModelVersions', () => {
  it('returns the correct value for greater app version', () => {
    const result = compareVirtualVersions({
      appVersions: {
        foo: '10.3.0',
        bar: '10.2.0',
      },
      indexVersions: {
        foo: '10.2.0',
        bar: '10.2.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('greater');
  });

  it('returns the correct value for lesser app version', () => {
    const result = compareVirtualVersions({
      appVersions: {
        foo: '10.1.0',
        bar: '10.2.0',
      },
      indexVersions: {
        foo: '10.2.0',
        bar: '10.2.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('lesser');
  });

  it('returns the correct value for equal versions', () => {
    const result = compareVirtualVersions({
      appVersions: {
        foo: '10.2.0',
        bar: '10.2.0',
      },
      indexVersions: {
        foo: '10.2.0',
        bar: '10.2.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('equal');
  });

  it('handles new types not being present in the index', () => {
    const result = compareVirtualVersions({
      appVersions: {
        foo: '10.2.0',
        bar: '10.1.0',
      },
      indexVersions: {
        foo: '10.2.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('greater');
  });

  it('handles types not being present in the app', () => {
    const result = compareVirtualVersions({
      appVersions: {
        foo: '10.3.0',
      },
      indexVersions: {
        foo: '10.2.0',
        old: '10.1.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('conflict');
  });

  it('returns the correct value for conflicts', () => {
    const result = compareVirtualVersions({
      appVersions: {
        a: '10.3.0',
        b: '10.3.0',
        c: '10.3.0',
      },
      indexVersions: {
        a: '10.2.0',
        b: '10.3.0',
        c: '10.4.0',
      },
      deletedTypes: [],
    });

    expect(result.status).toEqual('conflict');
  });

  it('properly lists the details', () => {
    const result = compareVirtualVersions({
      appVersions: {
        a: '10.3.0',
        b: '10.3.0',
        c: '10.3.0',
      },
      indexVersions: {
        a: '10.2.0',
        b: '10.3.0',
        c: '10.4.0',
      },
      deletedTypes: [],
    });

    expect(result.details.lesser).toEqual(['c']);
    expect(result.details.equal).toEqual(['b']);
    expect(result.details.greater).toEqual(['a']);
  });

  it('ignores deleted types when comparing', () => {
    const result = compareVirtualVersions({
      appVersions: {
        a: '10.3.0',
      },
      indexVersions: {
        a: '10.2.0',
        b: '10.3.0',
      },
      deletedTypes: ['b'],
    });

    expect(result.status).toEqual('greater');
  });
});
