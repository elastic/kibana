/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import execa from 'execa';

// Use var for proper hoisting in Jest mocks
// eslint-disable-next-line no-var
var mockExecAsync: jest.Mock;

jest.mock('fs');
jest.mock('execa');
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('util', () => {
  const actual = jest.requireActual('util');
  mockExecAsync = jest.fn();
  return {
    ...actual,
    promisify: jest.fn(() => mockExecAsync),
  };
});
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo/root' }));
jest.mock('@kbn/repo-packages', () => ({
  getPkgsById: jest.fn(() => {
    const map = new Map();
    map.set('@kbn/mcp-dev-server', {
      normalizedRepoRelativeDir: 'src/platform/packages/shared/kbn-mcp-dev-server',
    });
    map.set('@kbn/test-package', {
      normalizedRepoRelativeDir: 'src/test/package',
    });
    return map;
  }),
}));

import { getPkgsById } from '@kbn/repo-packages';
import { runUnitTestsTool } from './run_unit_tests';
import { parseToolResultJsonContent } from './test_utils';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedExeca = execa as jest.Mocked<typeof execa>;
const mockedGetPkgsById = getPkgsById as jest.Mock;

const createDefaultPkgsMap = () => {
  const map = new Map();
  map.set('@kbn/mcp-dev-server', {
    normalizedRepoRelativeDir: 'src/platform/packages/shared/kbn-mcp-dev-server',
  });
  map.set('@kbn/test-package', {
    normalizedRepoRelativeDir: 'src/test/package',
  });
  return map;
};

describe('runUnitTestsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default mock implementation for getPkgsById.
    mockedGetPkgsById.mockImplementation(createDefaultPkgsMap);
  });

  describe('tool definition', () => {
    it('has correct name', () => {
      expect(runUnitTestsTool.name).toBe('run_unit_tests');
    });

    it('has a description', () => {
      expect(runUnitTestsTool.description).toBeTruthy();
      expect(typeof runUnitTestsTool.description).toBe('string');
    });

    it('has an input schema', () => {
      expect(runUnitTestsTool.inputSchema).toBeDefined();
    });

    it('has a handler function', () => {
      expect(runUnitTestsTool.handler).toBeDefined();
      expect(typeof runUnitTestsTool.handler).toBe('function');
    });
  });

  describe('handler', () => {
    const mockJestOutput = {
      testResults: [
        {
          name: '/repo/root/src/test/file.test.ts',
          status: 'passed',
          assertionResults: [
            {
              title: 'test case 1',
              ancestorTitles: ['describe block'],
              status: 'passed',
              failureMessages: [],
            },
            {
              title: 'test case 2',
              ancestorTitles: ['describe block'],
              status: 'passed',
              failureMessages: [],
            },
          ],
        },
      ],
    };

    const setupMocks = (options: {
      packageDir?: string;
      jestOutput?: any;
      jestError?: any;
      coverageSummary?: any;
      coverageFinal?: any;
      changedFiles?: { modified: string[]; untracked: string[] };
      packageFound?: boolean;
      jestConfigExists?: boolean;
    }) => {
      const {
        packageDir = '/repo/root/src/platform/packages/shared/kbn-mcp-dev-server',
        jestOutput = mockJestOutput,
        jestError,
        coverageSummary,
        coverageFinal,
        changedFiles,
        packageFound = true,
        jestConfigExists = true,
      } = options;

      // Mock fs.existsSync
      (mockedFs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('jest.config.js')) {
          return jestConfigExists;
        }
        if (filePath.includes('coverage-summary.json')) {
          return !!coverageSummary;
        }
        if (filePath.includes('coverage-final.json')) {
          return !!coverageFinal;
        }
        if (filePath === packageDir) {
          return packageFound;
        }
        return true;
      });

      // Mock fs.readFileSync for coverage files
      (mockedFs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('coverage-summary.json')) {
          return JSON.stringify(
            coverageSummary || { total: { lines: {}, statements: {}, functions: {}, branches: {} } }
          );
        }
        if (filePath.includes('coverage-final.json')) {
          return JSON.stringify(coverageFinal || {});
        }
        throw new Error(`File not found: ${filePath}`);
      });

      // Mock execa.command for Jest execution.
      // The code uses execa's `all` property (combined stdout+stderr).
      if (jestError) {
        mockedExeca.command.mockRejectedValue(jestError);
      } else {
        mockedExeca.command.mockResolvedValue({
          all: `Some prefix text\n${JSON.stringify(jestOutput)}`,
          exitCode: 0,
        } as any);
      }

      // Mock execAsync for git commands
      if (changedFiles) {
        mockExecAsync.mockImplementation((command: string) => {
          if (command.includes('git diff')) {
            return Promise.resolve({ stdout: changedFiles.modified.join('\n') });
          }
          if (command.includes('git ls-files')) {
            return Promise.resolve({ stdout: changedFiles.untracked.join('\n') });
          }
          return Promise.resolve({ stdout: '' });
        });
      } else {
        mockExecAsync.mockResolvedValue({ stdout: '' });
      }
    };

    describe('with package parameter', () => {
      it('finds package by package ID', async () => {
        setupMocks({});

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.results).toHaveLength(1);
        expect(parsedResult.results[0].package).toBe(
          'src/platform/packages/shared/kbn-mcp-dev-server'
        );
        expect(mockedExeca.command).toHaveBeenCalled();
      });

      it('finds package by partial name', async () => {
        setupMocks({});

        const result = await runUnitTestsTool.handler({
          package: 'mcp-dev',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.results).toHaveLength(1);
      });

      it('finds package by relative directory path', async () => {
        setupMocks({});

        const result = await runUnitTestsTool.handler({
          package: 'src/platform/packages/shared/kbn-mcp-dev-server',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.results).toHaveLength(1);
      });

      it('finds package by absolute path', async () => {
        setupMocks({});

        const result = await runUnitTestsTool.handler({
          package: '/repo/root/src/platform/packages/shared/kbn-mcp-dev-server',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.results).toHaveLength(1);
      });

      it('returns error when package not found', async () => {
        mockedGetPkgsById.mockReturnValue(new Map());
        setupMocks({ packageFound: false, jestConfigExists: false });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/nonexistent',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(false);
        expect(parsedResult.message).toContain('Package not found');
        expect(parsedResult.results).toHaveLength(0);
      });

      it('returns error when package directory lacks jest.config.js', async () => {
        // Setup mocks so package is found but jest.config.js doesn't exist
        setupMocks({ packageFound: true, jestConfigExists: false });
        // Override existsSync to return false for jest.config.js but true for package dir
        (mockedFs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
          if (filePath.includes('jest.config.js')) {
            return false;
          }
          return true;
        });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(false);
        expect(parsedResult.message).toContain('jest.config.js');
        expect(parsedResult.results).toHaveLength(0);
      });

      it('includes coverage data when collectCoverage is true', async () => {
        const coverageSummary = {
          total: {
            lines: { total: 100, covered: 80, pct: 80 },
            statements: { total: 100, covered: 80, pct: 80 },
            functions: { total: 50, covered: 40, pct: 80 },
            branches: { total: 50, covered: 40, pct: 80 },
          },
        };

        const coverageFinal = {
          '/repo/root/src/test/file.ts': {
            statementMap: {
              '0': { start: { line: 1 } },
              '1': { start: { line: 2 } },
            },
            s: { '0': 1, '1': 0 },
          },
        };

        setupMocks({ coverageSummary, coverageFinal });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
          collectCoverage: true,
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.results[0].coverage).toBeDefined();
        expect(parsedResult.results[0].coverage?.summary.lines.pct).toBe(80);
      });

      it('handles Jest test failures gracefully', async () => {
        const jestOutputWithFailures = {
          testResults: [
            {
              name: '/repo/root/src/test/file.test.ts',
              status: 'failed',
              assertionResults: [
                {
                  title: 'failing test',
                  ancestorTitles: [],
                  status: 'failed',
                  failureMessages: ['Test failed'],
                },
              ],
            },
          ],
        };

        setupMocks({ jestOutput: jestOutputWithFailures });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(false);
        expect(parsedResult.results[0].status).toBe('failed');
        expect(parsedResult.results[0].summary.failedTests).toBe(1);
      });

      it('truncates failure messages when verbose is false', async () => {
        const longMessage = 'A'.repeat(1000);
        const jestOutputWithLongFailure = {
          testResults: [
            {
              name: '/repo/root/src/test/file.test.ts',
              status: 'failed',
              assertionResults: [
                {
                  title: 'failing test',
                  ancestorTitles: [],
                  status: 'failed',
                  failureMessages: [longMessage],
                },
              ],
            },
          ],
        };

        setupMocks({ jestOutput: jestOutputWithLongFailure });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
          verbose: false,
        });

        const parsedResult = parseToolResultJsonContent(result);
        const failureMessage =
          parsedResult.results[0].testSuites[0].assertions[0].failureMessages[0];
        expect(failureMessage.length).toBeLessThan(longMessage.length);
        expect(failureMessage).toContain('... [truncated]');
      });

      it('handles Jest error with stdout containing JSON', async () => {
        const jestError = {
          stdout: `Error prefix\n${JSON.stringify(mockJestOutput)}`,
          stderr: 'Some error',
          all: `Error prefix\n${JSON.stringify(mockJestOutput)}\nSome error`,
        };

        setupMocks({ jestError });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.results).toHaveLength(1);
      });

      it('handles Jest output without JSON', async () => {
        setupMocks({});
        // Override the execa mock after setupMocks to return output without JSON.
        mockedExeca.command.mockResolvedValue({
          all: 'No JSON here',
          exitCode: 0,
        } as any);

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.results[0].testSuites).toHaveLength(0);
      });
    });

    describe('without package parameter (changed files)', () => {
      it('runs tests for changed files', async () => {
        setupMocks({
          changedFiles: {
            modified: ['src/platform/packages/shared/kbn-mcp-dev-server/src/file.ts'],
            untracked: [],
          },
        });

        // Mock findPackageDir by making jest.config.js exist in parent dirs
        (mockedFs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
          if (filePath.includes('jest.config.js')) {
            return filePath.includes('kbn-mcp-dev-server');
          }
          return false;
        });

        const result = await runUnitTestsTool.handler({});

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(mockExecAsync).toHaveBeenCalled();
      });

      it('filters out ignored file extensions', async () => {
        setupMocks({
          changedFiles: {
            modified: ['src/file.ts', 'src/file.json', 'src/file.md', 'src/file.png'],
            untracked: [],
          },
        });

        (mockedFs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
          if (filePath.includes('jest.config.js')) {
            return true;
          }
          return false;
        });

        await runUnitTestsTool.handler({});

        // Should only process .ts file, not .json, .md, .png
        expect(mockExecAsync).toHaveBeenCalled();
      });

      it('returns success message when no testable changed files found', async () => {
        setupMocks({
          changedFiles: {
            modified: ['src/file.json'],
            untracked: [],
          },
        });

        (mockedFs.existsSync as jest.Mock).mockReturnValue(false);

        const result = await runUnitTestsTool.handler({});

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.message).toBe('No testable changed files found.');
        expect(parsedResult.results).toHaveLength(0);
      });

      it('groups changed files by package', async () => {
        setupMocks({
          changedFiles: {
            modified: [
              'src/platform/packages/shared/kbn-mcp-dev-server/src/file1.ts',
              'src/platform/packages/shared/kbn-mcp-dev-server/src/file2.ts',
              'src/test/package/src/file3.ts',
            ],
            untracked: [],
          },
        });

        let callCount = 0;
        (mockedFs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
          if (filePath.includes('jest.config.js')) {
            callCount++;
            return true;
          }
          return false;
        });

        const result = await runUnitTestsTool.handler({});

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.success).toBe(true);
        // Should run Jest for each package
        expect(mockedExeca.command).toHaveBeenCalled();
      });
    });

    describe('coverage parsing', () => {
      it('returns undefined when coverage summary does not exist', async () => {
        setupMocks({ coverageSummary: undefined });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
          collectCoverage: true,
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.results[0].coverage).toBeUndefined();
      });

      it('parses coverage files correctly', async () => {
        const coverageSummary = {
          total: {
            lines: { total: 100, covered: 80, pct: 80 },
            statements: { total: 100, covered: 80, pct: 80 },
            functions: { total: 50, covered: 40, pct: 80 },
            branches: { total: 50, covered: 40, pct: 80 },
          },
          '/repo/root/src/test/file.ts': {
            lines: { total: 10, covered: 8, pct: 80 },
          },
        };

        const coverageFinal = {
          '/repo/root/src/test/file.ts': {
            statementMap: {
              '0': { start: { line: 1 } },
              '1': { start: { line: 2 } },
              '2': { start: { line: 5 } },
            },
            s: { '0': 1, '1': 0, '2': 0 },
          },
        };

        setupMocks({ coverageSummary, coverageFinal });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
          collectCoverage: true,
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.results[0].coverage).toBeDefined();
        expect(parsedResult.results[0].coverage?.files).toHaveLength(1);
        expect(parsedResult.results[0].coverage?.files[0].uncoveredLines).toEqual([2, 5]);
      });

      it('handles missing file stats in coverage summary', async () => {
        const coverageSummary = {
          total: {
            lines: { total: 100, covered: 80, pct: 80 },
            statements: { total: 100, covered: 80, pct: 80 },
            functions: { total: 50, covered: 40, pct: 80 },
            branches: { total: 50, covered: 40, pct: 80 },
          },
        };

        const coverageFinal = {
          '/repo/root/src/test/file.ts': {
            statementMap: {
              '0': { start: { line: 1 } },
            },
            s: { '0': 0 },
          },
        };

        setupMocks({ coverageSummary, coverageFinal });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
          collectCoverage: true,
        });

        const parsedResult = parseToolResultJsonContent(result);
        expect(parsedResult.results[0].coverage?.files[0].lines.total).toBe(0);
      });
    });

    describe('message truncation', () => {
      it('does not truncate short failure messages', async () => {
        const shortMessage = 'Short error';
        const jestOutputWithShortFailure = {
          testResults: [
            {
              name: '/repo/root/src/test/file.test.ts',
              status: 'failed',
              assertionResults: [
                {
                  title: 'failing test',
                  ancestorTitles: [],
                  status: 'failed',
                  failureMessages: [shortMessage],
                },
              ],
            },
          ],
        };

        setupMocks({ jestOutput: jestOutputWithShortFailure });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
          verbose: false,
        });

        const parsedResult = parseToolResultJsonContent(result);
        const failureMessage =
          parsedResult.results[0].testSuites[0].assertions[0].failureMessages[0];
        // Short messages should not be truncated.
        expect(failureMessage).toBe(shortMessage);
        expect(failureMessage).not.toContain('truncated');
      });
    });

    describe('default values', () => {
      it('defaults collectCoverage to false', async () => {
        setupMocks({});

        await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
        });

        const call = mockedExeca.command.mock.calls[0][0] as string;
        expect(call).not.toContain('--coverage');
      });

      it('defaults verbose to true', async () => {
        const jestOutputWithFailure = {
          testResults: [
            {
              name: '/repo/root/src/test/file.test.ts',
              status: 'passed',
              assertionResults: [
                {
                  title: 'test',
                  ancestorTitles: [],
                  status: 'passed',
                  failureMessages: [],
                },
              ],
            },
          ],
        };

        setupMocks({ jestOutput: jestOutputWithFailure });

        const result = await runUnitTestsTool.handler({
          package: '@kbn/mcp-dev-server',
        });

        const parsedResult = parseToolResultJsonContent(result);
        // With verbose=true, all assertions should be included
        expect(parsedResult.results[0].testSuites[0].assertions.length).toBeGreaterThan(0);
      });
    });
  });
});
