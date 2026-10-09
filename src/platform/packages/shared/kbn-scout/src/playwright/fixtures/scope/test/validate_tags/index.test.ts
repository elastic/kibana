/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '../../../../tags';
import { findTagIssues } from '.';

describe('findTagIssues', () => {
  it('accepts a test target tag on its own', () => {
    expect(findTagIssues(['@local-stateful-classic'])).toEqual([]);
  });

  it('accepts the performance tag on its own', () => {
    expect(findTagIssues(tags.performance)).toEqual([]);
  });

  it('accepts a test target tag narrowed by a limit tag', () => {
    expect(findTagIssues(['@local-stateful-classic', tags.limit.only.fips])).toEqual([]);
    expect(findTagIssues(['@local-stateful-classic', tags.limit.except.fips])).toEqual([]);
  });

  it('rejects unsupported tags', () => {
    expect(findTagIssues(['@local-stateful-classic', '@nonsense'])).toEqual([
      expect.stringContaining('Unsupported tag(s) found: @nonsense'),
    ]);
  });

  it('rejects malformed limit tags', () => {
    expect(findTagIssues(['@local-stateful-classic', '@limit/only-quantum'])).toEqual([
      expect.stringContaining('Unsupported tag(s) found: @limit/only-quantum'),
    ]);
  });

  it('rejects a limit tag without a test target tag', () => {
    expect(findTagIssues([tags.limit.only.fips])).toEqual([
      expect.stringContaining('At least one of the following tags is required'),
    ]);
  });

  it('rejects conflicting limit tags for the same target attribute', () => {
    expect(
      findTagIssues(['@local-stateful-classic', tags.limit.only.fips, tags.limit.except.fips])
    ).toEqual([
      expect.stringContaining(
        "Conflicting limit tags for the 'fips' target attribute: @limit/only-fips, @limit/except-fips"
      ),
    ]);
  });

  it('reports every issue it finds', () => {
    expect(findTagIssues(['@nonsense', tags.limit.only.fips, tags.limit.except.fips])).toHaveLength(
      3
    );
  });
});
