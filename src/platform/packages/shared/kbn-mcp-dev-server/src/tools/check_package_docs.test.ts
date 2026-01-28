/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';

import { checkPackageDocsTool } from './check_package_docs';
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
    {
      id: '@kbn/dashboard-markdown',
      directory: '/repo/src/platform/plugins/shared/dashboard_markdown',
      manifest: { id: '@kbn/dashboard-markdown', plugin: { id: 'dashboardMarkdown' } },
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
    apiCount: 5,
    missingExports: 0,
    missingComments: 0,
    isAnyType: 0,
    noReferences: 0,
    missingReturns: 0,
    paramDocMismatches: 0,
    missingComplexTypeInfo: 0,
  },
  missingComments: [],
  isAnyType: [],
  missingReturns: [],
  paramDocMismatches: [],
  missingComplexTypeInfo: [],
  ...overrides,
});

describe('checkPackageDocsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('target parameter', () => {
    it('returns error when package is not found', async () => {
      const result = await checkPackageDocsTool.handler({ target: '@kbn/unknown' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain("'@kbn/unknown' not found");
    });

    it('returns error with suggestions when package is not found but similar ones exist', async () => {
      // Use a partial match that doesn't exactly match any plugin ID.
      const result = await checkPackageDocsTool.handler({ target: 'dashb' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain("'dashb' not found");
      expect(parsed.error).toContain('Did you mean');
      expect(parsed.error).toContain('dashboard (@kbn/dashboard-plugin)');
    });

    it('finds plugin by plugin ID (e.g., dashboard)', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      // Using the plugin ID directly should work.
      const result = await checkPackageDocsTool.handler({ target: 'dashboard' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toBeUndefined();
      expect(parsed.package).toBe('@kbn/dashboard-plugin');
      expect(parsed.passed).toBe(true);
    });

    it('finds package by manifest ID (auto-detects scoped package names)', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      // Scoped package names starting with @ should be auto-detected as IDs, not files.
      const result = await checkPackageDocsTool.handler({ target: '@kbn/test-pkg' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toBeUndefined();
      expect(parsed.package).toBe('@kbn/test-pkg');
    });
  });

  describe('type parameter', () => {
    it('treats target as file when type is "file"', async () => {
      const result = await checkPackageDocsTool.handler({
        target: '/some/random/file.ts',
        type: 'file',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain('Could not find a package');
    });

    it('auto-detects file type when target contains "/"', async () => {
      const result = await checkPackageDocsTool.handler({
        target: '/some/random/file.ts',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain('Could not find a package');
    });

    it('treats target as plugin/package when type is "plugin"', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await checkPackageDocsTool.handler({
        target: 'dashboard',
        type: 'plugin',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toBeUndefined();
      expect(parsed.package).toBe('@kbn/dashboard-plugin');
    });

    it('treats target as package when type is "package"', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await checkPackageDocsTool.handler({
        target: '@kbn/test-pkg',
        type: 'package',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toBeUndefined();
      expect(parsed.package).toBe('@kbn/test-pkg');
    });
  });

  describe('stats file handling', () => {
    it('returns error when stats file does not exist after CLI run', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await checkPackageDocsTool.handler({ target: '@kbn/test-pkg' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toContain('Stats file not found');
    });
  });

  describe('pass/fail status', () => {
    it('returns pass/fail status with counts for a clean package', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(createMockStats()));

      const result = await checkPackageDocsTool.handler({ target: '@kbn/test-pkg' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.passed).toBe(true);
      expect(parsed.totalIssues).toBe(0);
      expect(parsed.counts.apiCount).toBe(5);
    });

    it('returns pass=false when issues exist', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify(
          createMockStats({
            counts: {
              apiCount: 10,
              missingExports: 1,
              missingComments: 3,
              isAnyType: 2,
              noReferences: 0,
              missingReturns: 1,
              paramDocMismatches: 0,
              missingComplexTypeInfo: 0,
            },
            missingComments: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }, { path: 'src/c.ts' }],
            isAnyType: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }],
            missingReturns: [{ path: 'src/a.ts' }],
          })
        )
      );

      const result = await checkPackageDocsTool.handler({ target: '@kbn/test-pkg' });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.passed).toBe(false);
      expect(parsed.totalIssues).toBe(7); // 3 + 2 + 1 + 1 (pending)
      expect(parsed.actionable).toBe(6); // 3 + 2 + 1
      expect(parsed.pending).toBe(1);
      expect(parsed.counts.missingComments).toBe(3);
      expect(parsed.counts.isAnyType).toBe(2);
      expect(parsed.counts.missingReturns).toBe(1);
      expect(parsed.counts.missingExports).toBe(1);
    });

    it('returns passed=true when only pending issues exist', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify(
          createMockStats({
            counts: {
              apiCount: 5,
              missingExports: 3,
              missingComments: 0,
              isAnyType: 0,
              noReferences: 0,
              missingReturns: 0,
              paramDocMismatches: 0,
              missingComplexTypeInfo: 0,
            },
          })
        )
      );

      const result = await checkPackageDocsTool.handler({ target: '@kbn/test-pkg' });
      const parsed = parseToolResultJsonContent(result);

      // Package passes because missingExports are pending (need human input).
      expect(parsed.passed).toBe(true);
      expect(parsed.totalIssues).toBe(3); // includes pending
      expect(parsed.actionable).toBe(0);
      expect(parsed.pending).toBe(3);
    });
  });

  describe('file filtering', () => {
    it('filters issues to specific file when target is a file path', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify(
          createMockStats({
            counts: {
              apiCount: 10,
              missingExports: 0,
              missingComments: 3,
              isAnyType: 1,
              noReferences: 0,
              missingReturns: 1,
              paramDocMismatches: 0,
              missingComplexTypeInfo: 0,
            },
            missingComments: [
              { path: 'packages/test-pkg/src/index.ts' },
              { path: 'packages/test-pkg/src/other.ts' },
              { path: 'packages/test-pkg/src/index.ts' },
            ],
            isAnyType: [{ path: 'packages/test-pkg/src/index.ts' }],
            missingReturns: [{ path: 'packages/test-pkg/src/other.ts' }],
          })
        )
      );

      const result = await checkPackageDocsTool.handler({
        target: 'packages/test-pkg/src/index.ts',
        type: 'file',
      });
      const parsed = parseToolResultJsonContent(result);

      expect(parsed.error).toBeUndefined();
      expect(parsed.file).toBe('packages/test-pkg/src/index.ts');
      // Should only count issues from index.ts (2 missingComments + 1 isAnyType).
      expect(parsed.totalIssues).toBe(3);
      expect(parsed.counts.missingComments).toBe(2);
      expect(parsed.counts.isAnyType).toBe(1);
      expect(parsed.counts.missingReturns).toBe(0);
    });
  });

  describe('tool metadata', () => {
    it('has correct tool metadata', () => {
      expect(checkPackageDocsTool.name).toBe('check_package_docs');
      expect(checkPackageDocsTool.description).toContain('Check');
      expect(checkPackageDocsTool.description).toContain('documentation issues');
    });
  });
});
