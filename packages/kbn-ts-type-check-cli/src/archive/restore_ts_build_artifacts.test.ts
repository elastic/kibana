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
import { restoreTSBuildArtifacts } from './restore_ts_build_artifacts';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  buildCandidateShaList,
  cleanTypeCheckArtifacts,
  getPullRequestNumber,
  isCiEnvironment,
  readRecentCommitShas,
  resolveCurrentCommitSha,
} from './utils';

vi.mock('./utils', () => {
  const mocked = {
    buildCandidateShaList: vi.fn(),
    cleanTypeCheckArtifacts: vi.fn(),
    getPullRequestNumber: vi.fn(),
    isCiEnvironment: vi.fn(),
    readRecentCommitShas: vi.fn(),
    resolveCurrentCommitSha: vi.fn(),
    withGcsAuth: vi.fn((_, action: () => Promise<unknown>) => action()),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./file_system/gcs_file_system', () => {
  const mocked = {
    GcsFileSystem: vi.fn().mockImplementation(() => ({
      restoreArchive: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

const mockedBuildCandidateShaList = buildCandidateShaList as MockedFunction<
  typeof buildCandidateShaList
>;
const mockedGetPullRequestNumber = getPullRequestNumber as MockedFunction<
  typeof getPullRequestNumber
>;
const mockedIsCiEnvironment = isCiEnvironment as MockedFunction<typeof isCiEnvironment>;
const mockedReadRecentCommitShas = readRecentCommitShas as MockedFunction<
  typeof readRecentCommitShas
>;
const mockedResolveCurrentCommitSha = resolveCurrentCommitSha as MockedFunction<
  typeof resolveCurrentCommitSha
>;
const mockedCleanTypeCheckArtifacts = cleanTypeCheckArtifacts as MockedFunction<
  typeof cleanTypeCheckArtifacts
>;

const createLog = (): SomeDevLog => {
  return {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as SomeDevLog;
};

describe('restoreTSBuildArtifacts', () => {
  let restoreSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsCiEnvironment.mockReturnValue(false);
    mockedGetPullRequestNumber.mockReturnValue(undefined);
    mockedResolveCurrentCommitSha.mockResolvedValue('');
    mockedReadRecentCommitShas.mockResolvedValue([]);
    mockedBuildCandidateShaList.mockReturnValue([]);
    restoreSpy = vi.spyOn(LocalFileSystem.prototype, 'restoreArchive').mockResolvedValue(undefined);
  });

  afterEach(() => {
    restoreSpy.mockRestore();
  });

  it('logs when there is no commit history to restore', async () => {
    const log = createLog();

    mockedBuildCandidateShaList.mockReturnValueOnce([]);

    await restoreTSBuildArtifacts(log);

    expect(log.info).toHaveBeenCalledWith(
      'No commit history available for TypeScript cache restore.'
    );
    expect(restoreSpy).not.toHaveBeenCalled();
  });

  it('restores artifacts using the LocalFileSystem when candidates exist', async () => {
    const log = createLog();

    const candidateShas = ['sha-current', 'sha-parent'];
    mockedResolveCurrentCommitSha.mockResolvedValueOnce('sha-current');
    mockedReadRecentCommitShas.mockResolvedValueOnce(['sha-parent']);
    mockedBuildCandidateShaList.mockReturnValueOnce(candidateShas);
    mockedGetPullRequestNumber.mockReturnValueOnce('456');

    await restoreTSBuildArtifacts(log);

    expect(restoreSpy).toHaveBeenCalledTimes(1);
    expect(restoreSpy).toHaveBeenCalledWith({
      cacheInvalidationFiles: ['pnpm-lock.yaml', '.nvmrc', '.node-version', 'tsconfig.base.json'],
      prNumber: '456',
      shas: candidateShas,
    });
  });

  it('logs a warning when restoration throws', async () => {
    const log = createLog();

    mockedResolveCurrentCommitSha.mockResolvedValueOnce('shaX');
    mockedReadRecentCommitShas.mockResolvedValueOnce(['shaY']);
    mockedBuildCandidateShaList.mockReturnValueOnce(['shaX']);

    restoreSpy.mockRejectedValueOnce(new Error('boom')); // ensure throw

    await restoreTSBuildArtifacts(log);

    expect(log.warning).toHaveBeenCalledWith(
      'Failed to restore TypeScript build artifacts: boom. Running type check without the cache.'
    );
    expect(mockedCleanTypeCheckArtifacts).toHaveBeenCalledWith(log);
  });
});
