/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildIdentity } from './build_comparator';
import { compareBuilds } from './build_comparator';

const build = (num: number): BuildIdentity => ({ sha: `sha-${num}`, num, date: 'unused' });

describe('compareBuilds', () => {
  it('returns a negative number when the first build is older', () => {
    expect(compareBuilds(build(100), build(101))).toBeLessThan(0);
  });

  it('returns a positive number when the first build is newer', () => {
    expect(compareBuilds(build(101), build(100))).toBeGreaterThan(0);
  });

  it('returns zero for the same build number', () => {
    expect(compareBuilds(build(100), build(100))).toBe(0);
  });
});
