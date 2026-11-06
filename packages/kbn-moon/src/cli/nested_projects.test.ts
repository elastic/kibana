/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findChildProjectDirs, findNestedProjects } from './nested_projects';

describe('findNestedProjects', () => {
  it('returns projects nested inside another project', () => {
    expect(findNestedProjects(['src/a', 'src/a/b', 'src/a/b/c', 'src/ab'], [])).toEqual([
      'src/a -> src/a/b',
      'src/a -> src/a/b/c',
      'src/a/b -> src/a/b/c',
    ]);
  });

  it('ignores allowlisted ancestors', () => {
    expect(findNestedProjects(['src/a', 'src/a/b', 'src/c', 'src/c/d'], ['src/a'])).toEqual([
      'src/c -> src/c/d',
    ]);
  });
});

describe('findChildProjectDirs', () => {
  it('returns the outermost nested projects relative to the parent', () => {
    expect(
      findChildProjectDirs('src/a', ['src/a', 'src/a/b', 'src/a/b/c', 'src/a/d', 'src/ab'])
    ).toEqual(['b', 'd']);
  });

  it('returns nothing for a project without nested projects', () => {
    expect(findChildProjectDirs('src/ab', ['src/a', 'src/a/b', 'src/ab'])).toEqual([]);
  });
});
