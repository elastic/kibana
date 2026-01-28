/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';

import { fixPackageDocsTool } from './fix_package_docs';
import { parseToolResultJsonContent } from './test_utils';

jest.mock('@kbn/repo-packages', () => ({
  getPackages: jest.fn(() => [
    {
      id: '@kbn/test-pkg',
      directory: '/repo/packages/test-pkg',
      manifest: { id: '@kbn/test-pkg' },
      isPlugin: (): boolean => false,
    },
    {
      id: '@kbn/dashboard-plugin',
      directory: '/repo/src/platform/plugins/shared/dashboard',
      manifest: { id: '@kbn/dashboard-plugin', plugin: { id: 'dashboard' } },
      isPlugin: (): boolean => true,
    },
  ]),
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

jest.mock('execa', () => jest.fn().mockResolvedValue({ exitCode: 0 }));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

const createMockStats = (overrides = {}) => ({
  counts: {
    apiCount: 10,
    missingExports: 0,
    missingComments: 2,
    isAnyType: 1,
    noReferences: 0,
    missingReturns: 1,
    paramDocMismatches: 1,
    missingComplexTypeInfo: 0,
  },
  missingComments: [
    {
      id: 'def-public.fn1',
      label: 'fn1',
      path: 'packages/test-pkg/src/index.ts',
      type: 'Function',
      lineNumber: 10,
      columnNumber: 1,
      link: 'https://github.com/elastic/kibana/blob/main/packages/test-pkg/src/index.ts#L10',
    },
    {
      id: 'def-public.fn2',
      label: 'fn2',
      path: 'packages/test-pkg/src/utils.ts',
      type: 'Function',
      lineNumber: 5,
      columnNumber: 1,
      link: 'https://github.com/elastic/kibana/blob/main/packages/test-pkg/src/utils.ts#L5',
    },
  ],
  isAnyType: [
    {
      id: 'def-public.badFn',
      label: 'badFn',
      path: 'packages/test-pkg/src/index.ts',
      type: 'Function',
      lineNumber: 20,
      columnNumber: 1,
      link: 'https://github.com/elastic/kibana/blob/main/packages/test-pkg/src/index.ts#L20',
    },
  ],
  noReferences: [],
  missingReturns: [
    {
      id: 'def-public.fn1',
      label: 'fn1',
      path: 'packages/test-pkg/src/index.ts',
      type: 'Function',
      lineNumber: 10,
      columnNumber: 1,
      link: 'https://github.com/elastic/kibana/blob/main/packages/test-pkg/src/index.ts#L10',
    },
  ],
  paramDocMismatches: [
    {
      id: 'def-public.fn3',
      label: 'fn3',
      path: 'packages/test-pkg/src/index.ts',
      type: 'Function',
      lineNumber: 30,
      columnNumber: 1,
      link: 'https://github.com/elastic/kibana/blob/main/packages/test-pkg/src/index.ts#L30',
    },
  ],
  missingComplexTypeInfo: [],
  missingExports: [],
  ...overrides,
});

describe('fixPackageDocsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('target parameter', () => {
    it('returns error when package is not found', async () => {
      const result = await fixPackageDocsTool.handler({ target: '@kbn/unknown' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain("'@kbn/unknown' not found");
    });

    it('finds package by manifest ID', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await fixPackageDocsTool.handler({ target: '@kbn/test-pkg' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toBeUndefined();
      expect(parsed.package).toBe('@kbn/test-pkg');
    });

    it('finds plugin by plugin ID', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await fixPackageDocsTool.handler({ target: 'dashboard' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toBeUndefined();
      expect(parsed.package).toBe('@kbn/dashboard-plugin');
    });
  });

  describe('type parameter', () => {
    it('treats target as file when type is "file"', async () => {
      const result = await fixPackageDocsTool.handler({
        target: '/some/random/file.ts',
        type: 'file',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain('Could not find a package');
    });

    it('auto-detects file type when target contains "/"', async () => {
      const result = await fixPackageDocsTool.handler({
        target: '/some/random/file.ts',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain('Could not find a package');
    });
  });

  describe('stats file handling', () => {
    it('returns error when stats file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await fixPackageDocsTool.handler({ target: '@kbn/test-pkg' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain('Stats file not found');
    });
  });

  describe('issues grouping', () => {
    it('returns issues grouped by file', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await fixPackageDocsTool.handler({ target: '@kbn/test-pkg' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.package).toBe('@kbn/test-pkg');
      expect(parsed.totalIssues).toBe(5); // 2 + 1 + 1 + 1
      expect(parsed.issuesByFile).toHaveLength(2); // index.ts and utils.ts

      const indexFile = parsed.issuesByFile.find((g: { file: string }) =>
        g.file.includes('index.ts')
      );
      expect(indexFile).toBeDefined();
      expect(indexFile.issues.length).toBeGreaterThan(0);
    });
  });

  describe('issue type filtering', () => {
    it('filters by issue type when specified', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await fixPackageDocsTool.handler({
        target: '@kbn/test-pkg',
        issueTypes: ['missingReturns'],
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.totalIssues).toBe(1);
      const allIssueTypes = parsed.issuesByFile.flatMap((g: { issues: { issueType: string }[] }) =>
        g.issues.map((i) => i.issueType)
      );
      expect(allIssueTypes).toEqual(['missingReturns']);
    });

    it('includes templates for actionable issues', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await fixPackageDocsTool.handler({
        target: '@kbn/test-pkg',
        issueTypes: ['missingReturns'],
      });
      const parsed = parseToolResultJsonContent(result);

      const issue = parsed.issuesByFile[0].issues[0];
      expect(issue.template).toBe('@returns {TYPE}');
    });

    it('includes missingExports when requested and counts them in totalIssues', async () => {
      const statsWithExports = createMockStats({
        missingExports: [
          { source: 'SomeType', references: ['file1.ts', 'file2.ts'] },
          { source: 'OtherType', references: ['file3.ts'] },
        ],
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(statsWithExports));

      const result = await fixPackageDocsTool.handler({
        target: '@kbn/test-pkg',
        issueTypes: ['missingExports'],
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.missingExports).toHaveLength(2);
      expect(parsed.missingExports[0].source).toBe('SomeType');
      // totalIssues should include missingExports when explicitly requested.
      expect(parsed.totalIssues).toBe(2);
    });
  });

  describe('file filtering', () => {
    it('filters issues by file path using relative path', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await fixPackageDocsTool.handler({
        target: 'packages/test-pkg/src/index.ts',
        type: 'file',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.package).toBe('@kbn/test-pkg');
      expect(parsed.file).toBe('packages/test-pkg/src/index.ts');
      // Should only include issues from index.ts (fn1 missingComments, badFn isAnyType, fn1 missingReturns, fn3 paramDocMismatches).
      expect(parsed.totalIssues).toBe(4);
      expect(parsed.issuesByFile).toHaveLength(1);
      expect(parsed.issuesByFile[0].file).toBe('packages/test-pkg/src/index.ts');
    });

    it('filters issues by file path using absolute path', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await fixPackageDocsTool.handler({
        target: '/repo/packages/test-pkg/src/utils.ts',
        type: 'file',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.package).toBe('@kbn/test-pkg');
      // Should only include issues from utils.ts (fn2 missingComments).
      expect(parsed.totalIssues).toBe(1);
      expect(parsed.issuesByFile).toHaveLength(1);
      expect(parsed.issuesByFile[0].file).toBe('packages/test-pkg/src/utils.ts');
    });
  });

  describe('tool metadata', () => {
    it('has correct tool metadata', () => {
      expect(fixPackageDocsTool.name).toBe('fix_package_docs');
      expect(fixPackageDocsTool.description).toContain('documentation issues');
      expect(fixPackageDocsTool.description).toContain('source context');
    });
  });
});
