/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCodeOwnersForFile, PathWithOwners } from './code_owners';

describe('getCodeOwnersForFile', () => {
  it('should return teams for exact file match', () => {
    const reversedCodeowners = [
      {
        path: 'src/file1.js',
        teams: ['team_a'],
        ignorePattern: {
          test: (filePath: string) => ({ ignored: filePath === 'src/file1.js' }),
        },
      },
    ] as PathWithOwners[];

    const result = getCodeOwnersForFile('src/file1.js', reversedCodeowners);
    expect(result).toEqual(['team_a']);
  });

  it('should return "unknown" if no ownership is found', () => {
    const reversedCodeowners = [
      {
        path: 'src/file1.js',
        teams: ['team_a'],
        ignorePattern: { test: (filePath: string) => ({ ignored: filePath === 'src/file1.js' }) },
      },
    ] as PathWithOwners[];

    const result = getCodeOwnersForFile('src/unknown_file.js', reversedCodeowners);
    expect(result).toEqual(['unknown']);
  });

  it('should return teams for partial match if no exact match exists', () => {
    const reversedCodeowners = [
      {
        path: 'src/folder',
        teams: ['team_c'],
        ignorePattern: {
          test: (filePath: string) => ({ ignored: filePath.startsWith('src/folder') }),
        },
      },
    ] as PathWithOwners[];

    const result = getCodeOwnersForFile('src/folder/subfolder/file.js', reversedCodeowners);
    expect(result).toEqual(['team_c']);
  });

  it('should handle root directory without ownership but with subdirectory owners', () => {
    const reversedCodeowners = [
      {
        path: 'folder/some/test',
        teams: ['team_a'],
        ignorePattern: {
          test: (filePath: string) => ({ ignored: filePath.startsWith('folder/some/test') }),
        },
      },
      {
        path: 'folder/another/test',
        teams: ['team_b'],
        ignorePattern: {
          test: (filePath: string) => ({ ignored: filePath.startsWith('folder/another/test') }),
        },
      },
    ] as PathWithOwners[];

    const result = getCodeOwnersForFile('folder', reversedCodeowners);
    expect(result).toEqual(['team_a', 'team_b']);
  });

  it('should return all unique teams if multiple subdirectories match', () => {
    const reversedCodeowners = [
      {
        path: 'folder/some/test',
        teams: ['team_a'],
        ignorePattern: {
          test: (filePath: string) => ({ ignored: filePath.startsWith('folder/some/test') }),
        },
      },
      {
        path: 'folder/another/test',
        teams: ['team_b'],
        ignorePattern: {
          test: (filePath: string) => ({ ignored: filePath.startsWith('folder/another/test') }),
        },
      },
    ] as PathWithOwners[];

    const result = getCodeOwnersForFile('folder/another/test/file.js', reversedCodeowners);
    expect(result).toEqual(['team_b']);
  });
});
