/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import globby from 'globby';
import { archiveTSBuildArtifacts } from './archive_ts_build_artifacts';
import { LocalFileSystem } from './file_system/local_file_system';
import { getPullRequestNumber, isCiEnvironment, resolveCurrentCommitSha } from './utils';

jest.mock('globby', () => jest.fn());

jest.mock('./utils', () => ({
  getPullRequestNumber: jest.fn(),
  isCiEnvironment: jest.fn(),
  resolveCurrentCommitSha: jest.fn(),
  withGcsAuth: jest.fn((_, action: () => Promise<unknown>) => action()),
}));

jest.mock('./file_system/gcs_file_system', () => ({
  GcsFileSystem: jest.fn().mockImplementation(() => ({
    updateArchive: jest.fn(),
  })),
}));

const mockedGlobby = globby as jest.MockedFunction<typeof globby>;
const mockedGetPullRequestNumber = getPullRequestNumber as jest.MockedFunction<
  typeof getPullRequestNumber
>;
const mockedIsCiEnvironment = isCiEnvironment as jest.MockedFunction<typeof isCiEnvironment>;
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

describe('archiveTSBuildArtifacts', () => {
  let updateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsCiEnvironment.mockReturnValue(false);
    mockedGetPullRequestNumber.mockReturnValue(undefined);
    mockedResolveCurrentCommitSha.mockResolvedValue('');
    mockedGlobby.mockResolvedValue([]);
    updateSpy = jest
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
      cacheInvalidationFiles: ['yarn.lock', '.nvmrc', '.node-version'],
      prNumber: '789',
      sha: 'abc123',
    });
  });
});
