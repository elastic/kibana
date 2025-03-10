/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupFilesByOwners } from './group_by_owners';

jest.mock('./code_owners', () => ({
  getPathsWithOwnersReversed: jest.fn(),
  getCodeOwnersForFile: jest.fn((file: string) => {
    const owners: Record<string, string[]> = {
      '/src/file1.js': ['team_a'],
      '/src/file2.js': ['team_b'],
      '/src/file3.js': ['team_a', 'team_c'],
    };
    return owners[file];
  }),
}));

describe('groupFilesByOwners', () => {
  it('should group files by single owners correctly', () => {
    const dependencies = [
      { from: '/src/file1.js', to: 'node_modules/module1' },
      { from: '/src/file2.js', to: 'node_modules/module2' },
    ];

    const result = groupFilesByOwners(dependencies);

    expect(result).toEqual({
      team_a: {
        modules: ['/src/file1.js'],
        deps: ['module1'],
        teams: ['team_a'],
      },
      team_b: {
        modules: ['/src/file2.js'],
        deps: ['module2'],
        teams: ['team_b'],
      },
    });
  });

  it('should group files with multiple owners under "multiple_teams"', () => {
    const dependencies = [
      { from: '/src/file3.js', to: 'node_modules/module3' },
      { from: '/src/file3.js', to: 'node_modules/module4' },
    ];

    const result = groupFilesByOwners(dependencies);

    expect(result).toEqual({
      multiple_teams: [
        {
          modules: ['/src/file3.js'],
          deps: ['module3', 'module4'],
          teams: ['team_a', 'team_c'],
        },
      ],
    });
  });

  it('should handle files with unknown owners', () => {
    const dependencies = [{ from: '/src/file_unknown.js', to: 'node_modules/module_unknown' }];

    const result = groupFilesByOwners(dependencies);

    expect(result).toEqual({
      unknown: {
        modules: ['/src/file_unknown.js'],
        deps: ['module_unknown'],
        teams: ['unknown'],
      },
    });
  });

  it('should correctly handle mixed ownership scenarios', () => {
    const dependencies = [
      { from: '/src/file1.js', to: 'node_modules/module1' },
      { from: '/src/file2.js', to: 'node_modules/module2' },
      { from: '/src/file3.js', to: 'node_modules/module3' },
      { from: '/src/file3.js', to: 'node_modules/module4' },
      { from: '/src/file_unknown.js', to: 'node_modules/module_unknown' },
    ];

    const result = groupFilesByOwners(dependencies);

    expect(result).toEqual({
      team_a: {
        modules: ['/src/file1.js'],
        deps: ['module1'],
        teams: ['team_a'],
      },
      team_b: {
        modules: ['/src/file2.js'],
        deps: ['module2'],
        teams: ['team_b'],
      },
      multiple_teams: [
        {
          modules: ['/src/file3.js'],
          deps: ['module3', 'module4'],
          teams: ['team_a', 'team_c'],
        },
      ],
      unknown: {
        modules: ['/src/file_unknown.js'],
        deps: ['module_unknown'],
        teams: ['unknown'],
      },
    });
  });
});
