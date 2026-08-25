/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupBySource } from './group_by_source.ts';

describe('groupBySource', () => {
  it('should group dependencies by their source files', () => {
    const dependencies = [
      { from: 'src/file1.js', to: 'node_modules/module1' },
      { from: 'src/file1.js', to: 'node_modules/module2' },
      { from: 'src/file2.js', to: 'node_modules/module3' },
    ];

    const result = groupBySource(dependencies);

    expect(result).toEqual({
      'src/file1.js': ['module1', 'module2'],
      'src/file2.js': ['module3'],
    });
  });

  it('should handle a single dependency', () => {
    const dependencies = [{ from: 'src/file1.js', to: 'node_modules/module1' }];

    const result = groupBySource(dependencies);

    expect(result).toEqual({
      'src/file1.js': ['module1'],
    });
  });

  it('should handle multiple dependencies from the same source', () => {
    const dependencies = [
      { from: 'src/file1.js', to: 'node_modules/module1' },
      { from: 'src/file1.js', to: 'node_modules/module2' },
      { from: 'src/file1.js', to: 'node_modules/module3' },
    ];

    const result = groupBySource(dependencies);

    expect(result).toEqual({
      'src/file1.js': ['module1', 'module2', 'module3'],
    });
  });

  it('should handle dependencies from different sources', () => {
    const dependencies = [
      { from: 'src/file1.js', to: 'node_modules/module1' },
      { from: 'src/file2.js', to: 'node_modules/module2' },
      { from: 'src/file3.js', to: 'node_modules/module3' },
    ];

    const result = groupBySource(dependencies);

    expect(result).toEqual({
      'src/file1.js': ['module1'],
      'src/file2.js': ['module2'],
      'src/file3.js': ['module3'],
    });
  });

  it('should remove "node_modules/" prefix from dependencies', () => {
    const dependencies = [
      { from: 'src/file1.js', to: 'node_modules/module1' },
      { from: 'src/file1.js', to: 'node_modules/module2' },
    ];

    const result = groupBySource(dependencies);

    expect(result).toEqual({
      'src/file1.js': ['module1', 'module2'],
    });
  });

  it('should return an empty object if there are no dependencies', () => {
    const result = groupBySource([]);

    expect(result).toEqual({});
  });
});
