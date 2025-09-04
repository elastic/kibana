/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

// Mock the dependencies first
jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('@kbn/dev-cli-errors', () => ({
  createFlagError: jest.fn((message: string) => new Error(message)),
}));

jest.mock('./dependency_tree', () => ({
  buildDependencyTree: jest.fn(),
  printTree: jest.fn(),
  printJson: jest.fn(),
}));

// Import after mocks are set up
import { runCli } from './cli';
import { buildDependencyTree, printTree, printJson } from './dependency_tree';
import { run as mockRun } from '@kbn/dev-cli-runner';

const mockBuildDependencyTree = buildDependencyTree as jest.MockedFunction<
  typeof buildDependencyTree
>;
const mockPrintTree = printTree as jest.MockedFunction<typeof printTree>;
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>;

describe('cli', () => {
  let mockLogger: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      write: jest.fn(),
    } as any;
  });

  describe('runCli', () => {
    it('should configure the CLI runner with correct options', () => {
      runCli();

      expect(mockRun).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          description:
            'CLI dependency tree visualization using tsconfig.json files with kbn_references',
          usage: 'node scripts/kbn_dependency_tree <tsconfig.json> [options]',
          flags: expect.objectContaining({
            boolean: ['paths', 'json'],
            string: ['filter'],
            number: ['depth'],
            default: {
              depth: 3,
            },
          }),
        })
      );
    });

    it('should include help text with examples', () => {
      runCli();

      const [, config] = mockRun.mock.calls[0];
      expect(config.flags.help).toContain('Examples:');
      expect(config.flags.help).toContain(
        'node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json'
      );
      expect(config.flags.help).toContain('--depth <n>');
      expect(config.flags.help).toContain('--paths');
      expect(config.flags.help).toContain('--filter <pattern>');
      expect(config.flags.help).toContain('--json');
    });
  });

  describe('CLI handler', () => {
    let cliHandler: (params: any) => Promise<void>;

    beforeEach(() => {
      runCli();
      cliHandler = mockRun.mock.calls[0][0];
    });

    it('should throw error when no tsconfig path provided', async () => {
      await expect(
        cliHandler({
          log: mockLogger,
          flags: { _: [] },
        })
      ).rejects.toThrow('Please provide a tsconfig.json file path as the first argument');
    });

    it('should throw error when tsconfig path is not a string', async () => {
      await expect(
        cliHandler({
          log: mockLogger,
          flags: { _: [123] },
        })
      ).rejects.toThrow('Please provide a tsconfig.json file path as the first argument');
    });

    it('should build dependency tree with default options', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'] },
      });

      expect(mockBuildDependencyTree).toHaveBeenCalledWith('test/tsconfig.json', {
        maxDepth: 3,
        filter: undefined,
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith('@kbn dependency tree for test/tsconfig.json');
      expect(mockPrintTree).toHaveBeenCalledWith(mockTree, '', true, false, mockLogger);
    });

    it('should use custom depth when provided', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'], depth: 5 },
      });

      expect(mockBuildDependencyTree).toHaveBeenCalledWith('test/tsconfig.json', {
        maxDepth: 5,
        filter: undefined,
        logger: mockLogger,
      });
    });

    it('should use filter when provided', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'], filter: '@kbn/ml-' },
      });

      expect(mockBuildDependencyTree).toHaveBeenCalledWith('test/tsconfig.json', {
        maxDepth: 3,
        filter: '@kbn/ml-',
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith('(filtered to packages containing: "@kbn/ml-")');
    });

    it('should show paths when paths flag is true', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'], paths: true },
      });

      expect(mockPrintTree).toHaveBeenCalledWith(mockTree, '', true, true, mockLogger);
    });

    it('should output JSON when json flag is true', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'], json: true },
      });

      expect(mockPrintJson).toHaveBeenCalledWith(mockTree, mockLogger);
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        '@kbn dependency tree for test/tsconfig.json'
      );
    });

    it('should not show legend in JSON mode', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'], json: true },
      });

      expect(mockLogger.info).not.toHaveBeenCalledWith('Legend:');
    });

    it('should show legend in normal mode', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'] },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Legend:');
      expect(mockLogger.info).toHaveBeenCalledWith(
        '  [EXTERNAL]     - Package not found in root package.json dependencies'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '  [CIRCULAR]     - Circular dependency detected'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '  [NO-TSCONFIG]  - Package found but no tsconfig.json'
      );
    });

    it('should handle null dependency tree', async () => {
      mockBuildDependencyTree.mockReturnValue(null);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'] },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'No dependencies found or unable to build dependency tree.'
      );
      expect(mockPrintTree).not.toHaveBeenCalled();
    });

    it('should show filter info in legend when filter is applied', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: { _: ['test/tsconfig.json'], filter: '@kbn/ml-' },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('  Filtered to packages containing: "@kbn/ml-"');
    });

    it('should handle combination of flags', async () => {
      const mockTree = { id: '@kbn/test-package', dependencies: [] };
      mockBuildDependencyTree.mockReturnValue(mockTree);

      await cliHandler({
        log: mockLogger,
        flags: {
          _: ['test/tsconfig.json'],
          depth: 2,
          filter: '@kbn/test',
          paths: true,
        },
      });

      expect(mockBuildDependencyTree).toHaveBeenCalledWith('test/tsconfig.json', {
        maxDepth: 2,
        filter: '@kbn/test',
        logger: mockLogger,
      });

      expect(mockPrintTree).toHaveBeenCalledWith(mockTree, '', true, true, mockLogger);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '(filtered to packages containing: "@kbn/test")'
      );
    });
  });
});
