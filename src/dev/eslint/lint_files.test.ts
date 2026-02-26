/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';

import { File } from '../file';
import { LINT_LOG_PREFIX } from './constants';

jest.mock('eslint', () => {
  const mockConstructor = jest.fn();
  const mockLintFiles = jest.fn();
  const mockLoadFormatter = jest.fn();
  const mockOutputFixes = jest.fn();

  return {
    ESLint: class ESLint {
      static outputFixes = mockOutputFixes;

      constructor(options: unknown) {
        mockConstructor(options);
      }

      public lintFiles = mockLintFiles;
      public loadFormatter = mockLoadFormatter;
    },
    __mock: {
      mockConstructor,
      mockLintFiles,
      mockLoadFormatter,
      mockOutputFixes,
    },
  };
});

import { lintFiles } from './lint_files';

const { __mock } = jest.requireMock('eslint') as {
  __mock: {
    mockConstructor: jest.Mock;
    mockLintFiles: jest.Mock;
    mockLoadFormatter: jest.Mock;
    mockOutputFixes: jest.Mock;
  };
};
const { mockConstructor, mockLintFiles, mockLoadFormatter, mockOutputFixes } = __mock;

describe('lintFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLintFiles.mockResolvedValue([
      {
        errorCount: 0,
        filePath: `${REPO_ROOT}/src/foo.ts`,
        output: 'fixed foo',
        warningCount: 0,
      },
      {
        errorCount: 0,
        filePath: `${REPO_ROOT}/src/bar.ts`,
        output: undefined,
        warningCount: 0,
      },
      {
        errorCount: 0,
        filePath: `${REPO_ROOT}/src/baz.ts`,
        output: 'fixed baz',
        warningCount: 0,
      },
    ]);
    mockLoadFormatter.mockResolvedValue({
      format: jest.fn(),
    });
  });

  it('returns and logs the files updated by eslint --fix', async () => {
    const log = {
      error: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    } as jest.Mocked<Pick<ToolingLog, 'error' | 'info' | 'success' | 'warning'>>;

    const result = await lintFiles(
      log as ToolingLog,
      [
        new File(`${REPO_ROOT}/src/foo.ts`),
        new File(`${REPO_ROOT}/src/bar.ts`),
        new File(`${REPO_ROOT}/src/baz.ts`),
      ],
      { fix: true }
    );

    expect(mockConstructor).toHaveBeenCalledWith({
      cache: true,
      cwd: REPO_ROOT,
      fix: true,
    });
    expect(mockOutputFixes).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      fixedFiles: ['src/baz.ts', 'src/foo.ts'],
      lintedFileCount: 3,
    });
    expect(log.success).toHaveBeenCalledWith(`${LINT_LOG_PREFIX} %d files linted successfully`, 3);
    expect(log.info).toHaveBeenCalledWith(`${LINT_LOG_PREFIX} auto-fixed %d file(s):`, 2);
    expect(log.info).toHaveBeenCalledWith('  %s', 'src/baz.ts');
    expect(log.info).toHaveBeenCalledWith('  %s', 'src/foo.ts');
  });
});
