/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';

// Use var for proper hoisting in Jest mocks (const/let have temporal dead zone issues)
// eslint-disable-next-line no-var
var mockExecFileAsync: jest.Mock;

jest.mock('fs');
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo/root' }));
jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));
jest.mock('util', () => {
  const actual = jest.requireActual('util');
  mockExecFileAsync = jest.fn();
  return {
    ...actual,
    promisify: jest.fn(() => mockExecFileAsync),
  };
});

import { searchByCodeownerTool } from './search_by_codeowner';
import { parseToolResultJsonContent } from './test_utils';

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('searchByCodeownerTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMocks = (options: {
    matchingFiles: string[];
    codeowners?: string;
    grepError?: { code: number; stdout?: string; stderr?: string };
  }) => {
    const { matchingFiles, codeowners, grepError } = options;

    // Mock CODEOWNERS file
    (mockedFs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes('CODEOWNERS')) {
        return (
          codeowners ||
          `
/src @elastic/kibana-core
/x-pack @elastic/kibana-platform
          `.trim()
        );
      }
      throw new Error(`File not found: ${filePath}`);
    });

    // Mock fs.statSync to check if directories exist
    (mockedFs.statSync as jest.Mock).mockImplementation((dirPath: string) => {
      const relativePath = dirPath.replace('/repo/root/', '');
      // Assume src and x-pack directories exist
      if (
        relativePath === 'src' ||
        relativePath === 'x-pack' ||
        relativePath.startsWith('src/') ||
        relativePath.startsWith('x-pack/')
      ) {
        return { isDirectory: () => true, isFile: () => false };
      }
      throw new Error('Path does not exist');
    });

    // Mock grep execFile
    if (grepError) {
      mockExecFileAsync.mockRejectedValue(grepError);
    } else {
      mockExecFileAsync.mockResolvedValue({
        stdout: matchingFiles.map((f) => `/repo/root/${f}`).join('\n'),
        stderr: '',
      });
    }
  };

  describe('handler', () => {
    it('finds files containing search term owned by specified team', async () => {
      setupMocks({
        matchingFiles: ['src/file1.ts', 'src/file2.tsx'],
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.searchTerm).toBe('TODO');
      expect(parsedResult.team).toBe('@elastic/kibana-core');
      expect(parsedResult.totalMatchingFiles).toBe(2);
      expect(parsedResult.matchingFiles).toContain('src/file1.ts');
      expect(parsedResult.matchingFiles).toContain('src/file2.tsx');
      expect(parsedResult.totalScannedFiles).toBe(1); // 1 directory searched
    });

    it('normalizes team name by adding @ prefix if missing', async () => {
      setupMocks({
        matchingFiles: ['src/file1.ts'],
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: 'elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.team).toBe('@elastic/kibana-core');
      expect(parsedResult.totalMatchingFiles).toBe(1);
    });

    it('returns zero results when no files match', async () => {
      setupMocks({
        matchingFiles: [],
        grepError: {
          code: 1,
          stdout: '',
        },
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'NONEXISTENT',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(0);
      expect(parsedResult.matchingFiles).toHaveLength(0);
    });

    it('returns zero results when team has no owned paths', async () => {
      setupMocks({
        matchingFiles: [],
        codeowners: `
/src @elastic/kibana-core
/x-pack @elastic/kibana-platform
        `.trim(),
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-security',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(0);
      expect(parsedResult.totalScannedFiles).toBe(0); // No directories for this team
    });

    it('only searches in directories that exist', async () => {
      (mockedFs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('CODEOWNERS')) {
          return `
/src @elastic/kibana-core
/nonexistent @elastic/kibana-core
          `.trim();
        }
        throw new Error(`File not found: ${filePath}`);
      });

      (mockedFs.statSync as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath.includes('nonexistent')) {
          throw new Error('Path does not exist');
        }
        return { isDirectory: () => true, isFile: () => false };
      });

      mockExecFileAsync.mockResolvedValue({
        stdout: '/repo/root/src/file1.ts',
        stderr: '',
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      // Should only search in /src (which exists), not /nonexistent
      expect(parsedResult.totalScannedFiles).toBe(1);
      expect(parsedResult.totalMatchingFiles).toBe(1);
    });

    it('handles grep errors gracefully', async () => {
      setupMocks({
        matchingFiles: [],
        grepError: {
          code: 2,
          stderr: 'grep error',
        },
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(0);
    });

    it('handles grep exit code 1 with stdout', async () => {
      setupMocks({
        matchingFiles: [],
        grepError: {
          code: 1,
          stdout: '/repo/root/src/file1.ts\n/repo/root/src/file2.ts',
        },
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.totalMatchingFiles).toBe(2);
      expect(parsedResult.matchingFiles).toContain('src/file1.ts');
      expect(parsedResult.matchingFiles).toContain('src/file2.ts');
    });

    it('returns analysis time in milliseconds', async () => {
      setupMocks({
        matchingFiles: ['src/file1.ts'],
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.analysisTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof parsedResult.analysisTimeMs).toBe('number');
    });

    it('sorts matching files alphabetically', async () => {
      setupMocks({
        matchingFiles: ['src/zzz.ts', 'src/aaa.ts', 'src/mmm.ts'],
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      expect(parsedResult.matchingFiles).toEqual(['src/aaa.ts', 'src/mmm.ts', 'src/zzz.ts']);
    });

    it('converts absolute paths to relative paths', async () => {
      setupMocks({
        matchingFiles: ['src/file1.ts'],
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);

      // Should return relative paths, not absolute
      expect(parsedResult.matchingFiles[0]).not.toContain('/repo/root');
      expect(parsedResult.matchingFiles[0]).toBe('src/file1.ts');
    });

    it('handles CODEOWNERS file with empty lines', async () => {
      setupMocks({
        matchingFiles: ['src/file1.ts'],
        codeowners: `
# Comment line

/src @elastic/kibana-core

# Another comment
        `.trim(),
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);
      expect(parsedResult.totalMatchingFiles).toBe(1);
    });

    it('handles CODEOWNERS file with malformed lines', async () => {
      setupMocks({
        matchingFiles: ['src/file1.ts'],
        codeowners: `
/src @elastic/kibana-core
malformed-line-without-team
/another/path
        `.trim(),
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // Should still work, ignoring malformed lines
      expect(parsedResult.totalMatchingFiles).toBe(1);
    });

    it('handles missing CODEOWNERS file gracefully', async () => {
      (mockedFs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      (mockedFs.statSync as jest.Mock).mockReturnValue({
        isDirectory: () => true,
        isFile: () => false,
      });

      mockExecFileAsync.mockResolvedValue({
        stdout: '',
        stderr: '',
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // Should return empty results when CODEOWNERS doesn't exist
      expect(parsedResult.totalMatchingFiles).toBe(0);
      expect(parsedResult.totalScannedFiles).toBe(0);
    });

    it('handles paths that do not exist in getTeamPaths', async () => {
      setupMocks({
        matchingFiles: [],
        codeowners: '/nonexistent/path @elastic/kibana-core',
      });

      (mockedFs.statSync as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath.includes('nonexistent')) {
          throw new Error('Path does not exist');
        }
        return { isDirectory: () => true, isFile: () => false };
      });

      const result = await searchByCodeownerTool.handler({
        searchTerm: 'TODO',
        team: '@elastic/kibana-core',
      });

      const parsedResult = parseToolResultJsonContent(result);
      // Should skip nonexistent paths
      expect(parsedResult.totalScannedFiles).toBe(0);
    });
  });

  describe('tool definition', () => {
    it('has correct name', () => {
      expect(searchByCodeownerTool.name).toBe('search_by_codeowner');
    });

    it('has a description', () => {
      expect(searchByCodeownerTool.description).toBeTruthy();
      expect(typeof searchByCodeownerTool.description).toBe('string');
    });

    it('has an input schema', () => {
      expect(searchByCodeownerTool.inputSchema).toBeDefined();
    });

    it('has a handler function', () => {
      expect(searchByCodeownerTool.handler).toBeDefined();
      expect(typeof searchByCodeownerTool.handler).toBe('function');
    });
  });
});
