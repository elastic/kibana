/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildDependencyTree, printTree, printJson } from './dependency_tree';
import {
  createMockLogger,
  setupFileSystemMocks,
  rootPackageJsonStandard,
  rootPackageJsonCircular,
  rootPackageJsonExternal,
  rootPackageJsonFiltered,
  rootPackageJsonNoTsconfig,
  rootPackageJsonDepth,
  tsconfigStandard,
  tsconfigCircular,
  tsconfigExternal,
  tsconfigFiltered,
  tsconfigDepth,
  simpleTreeWithChild,
  treeWithPaths,
  circularTree,
  externalTree,
  noTsconfigTree,
} from './fixtures';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock @kbn/repo-packages/utils/jsonc
jest.mock('@kbn/repo-packages/utils/jsonc', () => ({
  parse: jest.fn(),
}));

const { parse: mockParseJsonc } = jest.requireMock('@kbn/repo-packages/utils/jsonc');

describe('dependency_tree', () => {
  let mockLogger: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
  });

  describe('buildDependencyTree', () => {
    beforeEach(() => {
      setupFileSystemMocks({
        rootPackageJson: rootPackageJsonStandard,
        tsconfigFiles: tsconfigStandard,
      });
    });

    it('should build a simple dependency tree', () => {
      const tsconfigPath = 'packages/kbn-test-package/tsconfig.json';

      mockParseJsonc.mockImplementation((content) => {
        return JSON.parse(content);
      });

      const result = buildDependencyTree(tsconfigPath, { logger: mockLogger });

      expect(result).toBeDefined();
      expect(result?.id).toBe('@kbn/test-package');
      expect(result?.dependencies).toHaveLength(1);
      expect(result?.dependencies?.[0]?.id).toBe('@kbn/another-package');
    });

    it('should handle circular dependencies', () => {
      const tsconfigPath = 'packages/kbn-test-package/tsconfig.json';

      setupFileSystemMocks({
        rootPackageJson: rootPackageJsonCircular,
        tsconfigFiles: tsconfigCircular,
      });

      mockParseJsonc.mockImplementation((content) => {
        return JSON.parse(content);
      });

      const result = buildDependencyTree(tsconfigPath, { logger: mockLogger });

      expect(result).toBeDefined();
      expect(result?.id).toBe('@kbn/test-package');
      expect(result?.dependencies).toHaveLength(1);
      expect(result?.dependencies?.[0]?.id).toBe('@kbn/another-package');
      // The second level should detect the circular reference
      expect(result?.dependencies?.[0]?.dependencies?.[0]?.circular).toBe(true);
    });

    it('should handle external dependencies', () => {
      const tsconfigPath = 'packages/kbn-test-package/tsconfig.json';

      setupFileSystemMocks({
        rootPackageJson: rootPackageJsonExternal,
        tsconfigFiles: tsconfigExternal,
      });

      mockParseJsonc.mockImplementation((content) => {
        return JSON.parse(content);
      });

      const result = buildDependencyTree(tsconfigPath, { logger: mockLogger });

      expect(result).toBeDefined();
      expect(result?.dependencies).toHaveLength(1);
      expect(result?.dependencies?.[0]?.id).toBe('@kbn/external-package');
      expect(result?.dependencies?.[0]?.external).toBe(true);
    });

    it('should handle packages with no tsconfig', () => {
      const tsconfigPath = 'packages/kbn-test-package/tsconfig.json';

      setupFileSystemMocks({
        rootPackageJson: rootPackageJsonNoTsconfig,
        tsconfigFiles: { 'kbn-test-package': '{"kbn_references": ["@kbn/another-package"]}' },
        existingFiles: ['kbn-test-package'],
      });

      mockParseJsonc.mockImplementation((content) => {
        return JSON.parse(content);
      });

      const result = buildDependencyTree(tsconfigPath, { logger: mockLogger });

      expect(result).toBeDefined();
      expect(result?.dependencies).toHaveLength(1);
      expect(result?.dependencies?.[0]?.id).toBe('@kbn/another-package');
      expect(result?.dependencies?.[0]?.noTsconfig).toBe(true);
    });

    it('should respect maxDepth option', () => {
      const tsconfigPath = 'packages/kbn-test-package/tsconfig.json';

      setupFileSystemMocks({
        rootPackageJson: rootPackageJsonDepth,
        tsconfigFiles: tsconfigDepth,
      });

      mockParseJsonc.mockImplementation((content) => {
        return JSON.parse(content);
      });

      const resultDepth1 = buildDependencyTree(tsconfigPath, { maxDepth: 1, logger: mockLogger });
      const resultDepth2 = buildDependencyTree(tsconfigPath, { maxDepth: 2, logger: mockLogger });

      // At depth 1, we should see fewer nested dependencies
      expect(resultDepth1?.dependencies).toHaveLength(1);
      expect(resultDepth2?.dependencies).toHaveLength(1);

      // The key difference is in nested dependency resolution
      const depth1Nested = resultDepth1?.dependencies?.[0]?.dependencies?.length || 0;
      const depth2Nested = resultDepth2?.dependencies?.[0]?.dependencies?.length || 0;
      expect(depth1Nested).toBeLessThanOrEqual(depth2Nested);
    });

    it('should apply filter option', () => {
      const tsconfigPath = 'packages/kbn-test-package/tsconfig.json';

      setupFileSystemMocks({
        rootPackageJson: rootPackageJsonFiltered,
        tsconfigFiles: tsconfigFiltered,
      });

      mockParseJsonc.mockImplementation((content) => {
        return JSON.parse(content);
      });

      const result = buildDependencyTree(tsconfigPath, {
        filter: 'dev',
        logger: mockLogger,
      });

      expect(result?.dependencies).toHaveLength(1);
      expect(result?.dependencies?.[0]?.id).toBe('@kbn/dev-package');
    });

    it('should handle missing tsconfig file', () => {
      const tsconfigPath = 'non-existent/tsconfig.json';
      mockFs.existsSync.mockReturnValue(false);

      expect(() => buildDependencyTree(tsconfigPath, { logger: mockLogger })).toThrow(
        'Package name not found for tsconfig at non-existent/tsconfig.json'
      );
    });

    it('should handle malformed tsconfig file', () => {
      const tsconfigPath = 'packages/kbn-test-package/tsconfig.json';

      mockParseJsonc.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const result = buildDependencyTree(tsconfigPath, { logger: mockLogger });

      expect(result?.dependencies).toHaveLength(0);
      expect(mockLogger.warning).toHaveBeenCalled();
    });
  });

  describe('printTree', () => {
    it('should print simple tree structure', () => {
      printTree(simpleTreeWithChild, '', true, false, mockLogger);

      expect(mockLogger.write).toHaveBeenCalledWith('└─ @kbn/test-package');
      expect(mockLogger.write).toHaveBeenCalledWith('   └─ @kbn/child-package');
    });

    it('should print tree with paths when showPaths is true', () => {
      printTree(treeWithPaths, '', true, true, mockLogger);

      expect(mockLogger.write).toHaveBeenCalledWith(
        '└─ @kbn/test-package (packages/kbn-test-package)'
      );
      expect(mockLogger.write).toHaveBeenCalledWith(
        '   └─ @kbn/child-package (packages/kbn-child-package)'
      );
    });

    it('should print circular dependencies', () => {
      printTree(circularTree, '', true, false, mockLogger);

      expect(mockLogger.write).toHaveBeenCalledWith('   └─ @kbn/circular-package [CIRCULAR]');
    });

    it('should print external dependencies', () => {
      printTree(externalTree, '', true, false, mockLogger);

      expect(mockLogger.write).toHaveBeenCalledWith('   └─ @kbn/external-package [EXTERNAL]');
    });

    it('should print packages with no tsconfig', () => {
      printTree(noTsconfigTree, '', true, false, mockLogger);

      expect(mockLogger.write).toHaveBeenCalledWith('   └─ @kbn/no-tsconfig-package [NO-TSCONFIG]');
    });

    it('should handle null node', () => {
      printTree(null, '', true, false, mockLogger);
      expect(mockLogger.write).not.toHaveBeenCalled();
    });
  });

  describe('printJson', () => {
    it('should print tree as JSON', () => {
      const tree = {
        id: '@kbn/test-package',
        dependencies: [{ id: '@kbn/child-package' }],
      };

      printJson(tree, mockLogger);

      expect(mockLogger.write).toHaveBeenCalledWith(JSON.stringify(tree, null, 2));
    });

    it('should handle null tree', () => {
      printJson(null, mockLogger);
      expect(mockLogger.write).toHaveBeenCalledWith('null');
    });

    it('should work without logger', () => {
      const tree = { id: '@kbn/test-package' };
      expect(() => printJson(tree)).not.toThrow();
    });
  });
});
