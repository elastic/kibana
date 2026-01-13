/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import { restoreTSBuildArtifacts } from './restore_ts_build_artifacts';
import { LocalFileSystem } from './file_system/local_file_system';
import {
  buildCandidateShaList,
  getPullRequestNumber,
  isCiEnvironment,
  readRecentCommitShas,
  resolveCurrentCommitSha,
} from './utils';

jest.mock('./utils', () => ({
  buildCandidateShaList: jest.fn(),
  getPullRequestNumber: jest.fn(),
  isCiEnvironment: jest.fn(),
  readRecentCommitShas: jest.fn(),
  resolveCurrentCommitSha: jest.fn(),
  withGcsAuth: jest.fn((_, action: () => Promise<unknown>) => action()),
}));

jest.mock('./file_system/gcs_file_system', () => ({
  GcsFileSystem: jest.fn().mockImplementation(() => ({
    restoreArchive: jest.fn(),
  })),
}));

const mockedBuildCandidateShaList = buildCandidateShaList as jest.MockedFunction<
  typeof buildCandidateShaList
>;
const mockedGetPullRequestNumber = getPullRequestNumber as jest.MockedFunction<
  typeof getPullRequestNumber
>;
const mockedIsCiEnvironment = isCiEnvironment as jest.MockedFunction<typeof isCiEnvironment>;
const mockedReadRecentCommitShas = readRecentCommitShas as jest.MockedFunction<
  typeof readRecentCommitShas
>;
const mockedResolveCurrentCommitSha = resolveCurrentCommitSha as jest.MockedFunction<
  typeof resolveCurrentCommitSha
>;

const createLog = (): SomeDevLog => {
  return {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as SomeDevLog;
};

describe('restoreTSBuildArtifacts', () => {
  let restoreSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsCiEnvironment.mockReturnValue(false);
    mockedGetPullRequestNumber.mockReturnValue(undefined);
    mockedResolveCurrentCommitSha.mockResolvedValue('');
    mockedReadRecentCommitShas.mockResolvedValue([]);
    mockedBuildCandidateShaList.mockReturnValue([]);
    restoreSpy = jest
      .spyOn(LocalFileSystem.prototype, 'restoreArchive')
      .mockResolvedValue(undefined);
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
      cacheInvalidationFiles: ['yarn.lock', '.nvmrc', '.node-version'],
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

    expect(log.warning).toHaveBeenCalledWith('Failed to restore TypeScript build artifacts: boom');
  });
});
