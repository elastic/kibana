/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockInstance, MockedFunction } from 'vitest';

import type { SomeDevLog } from '@kbn/some-dev-log';
import { globby } from 'globby';
import { archiveTSBuildArtifacts } from './archive_ts_build_artifacts';
import { LocalFileSystem } from './file_system/local_file_system';
import { getPullRequestNumber, isCiEnvironment, resolveCurrentCommitSha } from './utils';

vi.mock('globby', () => {
  const mocked = { globby: vi.fn() };
  return { ...mocked, default: mocked };
});

vi.mock('./utils', () => {
  const mocked = {
    getPullRequestNumber: vi.fn(),
    isCiEnvironment: vi.fn(),
    resolveCurrentCommitSha: vi.fn(),
    withGcsAuth: vi.fn((_, action: () => Promise<unknown>) => action()),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./file_system/gcs_file_system', () => {
  const mocked = {
    GcsFileSystem: vi.fn().mockImplementation(() => ({
      updateArchive: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

const mockedGlobby = globby as MockedFunction<typeof globby>;
const mockedGetPullRequestNumber = getPullRequestNumber as MockedFunction<
  typeof getPullRequestNumber
>;
const mockedIsCiEnvironment = isCiEnvironment as MockedFunction<typeof isCiEnvironment>;
const mockedResolveCurrentCommitSha = resolveCurrentCommitSha as MockedFunction<
  typeof resolveCurrentCommitSha
>;

const createLog = (): SomeDevLog => {
  return {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as SomeDevLog;
};

describe('archiveTSBuildArtifacts', () => {
  let updateSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsCiEnvironment.mockReturnValue(false);
    mockedGetPullRequestNumber.mockReturnValue(undefined);
    mockedResolveCurrentCommitSha.mockResolvedValue('');
    mockedGlobby.mockResolvedValue([]);
    updateSpy = vi
      .spyOn(LocalFileSystem.prototype, 'updateArchive')
      .mockResolvedValue(Promise.resolve() as unknown as void);
  });

  afterEach(() => {
    updateSpy.mockRestore();
  });

  it('logs when no build artifacts are present', async () => {
    const log = createLog();

    mockedGlobby.mockResolvedValueOnce([]);

    await archiveTSBuildArtifacts(log);

    expect(log.info).toHaveBeenCalledWith('No TypeScript build artifacts found to archive.');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('warns when the commit SHA cannot be determined', async () => {
    const log = createLog();

    mockedGlobby.mockResolvedValueOnce(['a']);
    mockedResolveCurrentCommitSha.mockResolvedValueOnce(undefined);

    await archiveTSBuildArtifacts(log);

    expect(log.warning).toHaveBeenCalledWith(
      'Unable to determine commit SHA for TypeScript cache archive.'
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('uses the LocalFileSystem to archive matching artifacts', async () => {
    const log = createLog();
    const files = ['target/types/foo.d.ts', 'tsconfig.type_check.json'];

    mockedGlobby.mockResolvedValueOnce(files);
    mockedResolveCurrentCommitSha.mockResolvedValueOnce('abc123');
    mockedGetPullRequestNumber.mockReturnValueOnce('789');

    await archiveTSBuildArtifacts(log);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({
      files,
      cacheInvalidationFiles: ['pnpm-lock.yaml', '.nvmrc', '.node-version', 'tsconfig.base.json'],
      prNumber: '789',
      sha: 'abc123',
    });
  });
});
