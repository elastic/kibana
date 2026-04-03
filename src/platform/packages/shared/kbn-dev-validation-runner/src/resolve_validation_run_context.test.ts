/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  countCommitsBetweenRefs,
  hasStagedChanges,
  isShallowRepository,
  parseAndResolveValidationContract,
} from '@kbn/dev-utils';
import {
  getAffectedMoonProjectsFromChangedFiles,
  getMoonChangedFiles,
  resolveMoonAffectedBase,
  summarizeAffectedMoonProjects,
} from '@kbn/moon';

import {
  assertNoValidationRunFlagsForDirectTarget,
  resolveValidationAffectedProjects,
  resolveValidationRunContext,
} from './resolve_validation_run_context';

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: (message: string) => new Error(message),
}));

jest.mock('@kbn/dev-utils', () => ({
  countCommitsBetweenRefs: jest.fn(),
  hasStagedChanges: jest.fn(),
  isShallowRepository: jest.fn(),
  parseAndResolveValidationContract: jest.fn(),
  VALIDATION_PROFILE_DEFAULTS: {
    branch: {
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
    },
  },
}));

jest.mock('@kbn/moon', () => ({
  getAffectedMoonProjectsFromChangedFiles: jest.fn(),
  getMoonChangedFiles: jest.fn(),
  resolveMoonAffectedBase: jest.fn(),
  summarizeAffectedMoonProjects: jest.fn(),
}));

const mockParseAndResolveValidationContract = parseAndResolveValidationContract as jest.Mock;
const mockHasStagedChanges = hasStagedChanges as jest.Mock;
const mockIsShallowRepository = isShallowRepository as jest.Mock;
const mockResolveMoonAffectedBase = resolveMoonAffectedBase as jest.Mock;
const mockCountCommitsBetweenRefs = countCommitsBetweenRefs as jest.Mock;
const mockGetAffectedMoonProjectsFromChangedFiles =
  getAffectedMoonProjectsFromChangedFiles as jest.Mock;
const mockSummarizeAffectedMoonProjects = summarizeAffectedMoonProjects as jest.Mock;
const mockGetMoonChangedFiles = getMoonChangedFiles as jest.Mock;

describe('assertNoValidationRunFlagsForDirectTarget', () => {
  it('throws when direct target is combined with run flags', () => {
    expect(() => assertNoValidationRunFlagsForDirectTarget({ profile: 'quick' })).toThrow(
      'Cannot combine direct target mode with validation contract flags (--profile, --scope, --test-mode, --downstream, --base-ref, --head-ref).'
    );
  });

  it('allows direct target mode with no run flags', () => {
    expect(() => assertNoValidationRunFlagsForDirectTarget({})).not.toThrow();
  });
});

describe('resolveValidationRunContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/index.ts']);
    mockIsShallowRepository.mockResolvedValue(false);
  });

  it('returns full context for full scope', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'full',
      scope: 'full',
      testMode: 'all',
      downstream: 'none',
    });

    await expect(resolveValidationRunContext({ flags: {} })).resolves.toEqual({
      kind: 'full',
      contract: {
        profile: 'full',
        scope: 'full',
        testMode: 'all',
        downstream: 'none',
      },
    });
    expect(mockGetAffectedMoonProjectsFromChangedFiles).not.toHaveBeenCalled();
    expect(mockGetMoonChangedFiles).not.toHaveBeenCalled();
  });

  it('returns skip context for staged scope when no staged changes exist', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'precommit',
      scope: 'staged',
      testMode: 'related',
      downstream: 'none',
    });
    mockHasStagedChanges.mockResolvedValue(false);

    await expect(resolveValidationRunContext({ flags: {} })).resolves.toEqual({
      kind: 'skip',
      reason: 'no_staged_changes',
      contract: {
        profile: 'precommit',
        scope: 'staged',
        testMode: 'related',
        downstream: 'none',
      },
    });
    expect(mockResolveMoonAffectedBase).not.toHaveBeenCalled();
    expect(mockGetMoonChangedFiles).not.toHaveBeenCalled();
  });

  it('falls back to full context and emits warning when branch base resolution fails', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
      baseRef: undefined,
      headRef: undefined,
    });
    mockResolveMoonAffectedBase.mockRejectedValue(new Error('merge-base failed'));
    const warning = jest.fn();

    await expect(
      resolveValidationRunContext({
        flags: {},
        runnerDescription: 'type check',
        onWarning: warning,
      })
    ).resolves.toEqual({
      kind: 'full',
      reason: 'resolve_branch_scope_failed',
      contract: {
        profile: 'branch',
        scope: 'branch',
        testMode: 'affected',
        downstream: 'none',
        baseRef: undefined,
        headRef: undefined,
      },
    });
    expect(warning).toHaveBeenCalledWith(
      'Failed to resolve merge-base for affected type check (merge-base failed). Falling back to full type check.'
    );
    expect(mockGetMoonChangedFiles).not.toHaveBeenCalled();
  });

  it('returns affected context with branch change count and Moon-sourced changed files', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
      baseRef: undefined,
      headRef: undefined,
    });
    mockResolveMoonAffectedBase.mockResolvedValue({
      base: 'base-sha',
      baseRef: 'upstream/main',
    });
    mockCountCommitsBetweenRefs.mockResolvedValue(4);
    mockGetMoonChangedFiles.mockResolvedValue(['packages/foo/src/bar.ts']);

    const result = await resolveValidationRunContext({ flags: {} });

    expect(result).toEqual({
      kind: 'affected',
      contract: {
        profile: 'branch',
        scope: 'branch',
        testMode: 'affected',
        downstream: 'none',
        baseRef: undefined,
        headRef: undefined,
      },
      resolvedBase: {
        base: 'base-sha',
        baseRef: 'upstream/main',
      },
      branchCommitCount: 4,
      changedFiles: ['packages/foo/src/bar.ts'],
    });

    expect(mockGetAffectedMoonProjectsFromChangedFiles).not.toHaveBeenCalled();
    expect(mockGetMoonChangedFiles).toHaveBeenCalledWith({
      scope: 'branch',
      base: 'base-sha',
      head: undefined,
    });
  });

  it('keeps branch change count undefined when count lookup fails', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
    });
    mockResolveMoonAffectedBase.mockResolvedValue({
      base: 'base-sha',
      baseRef: 'upstream/main',
    });
    mockCountCommitsBetweenRefs.mockRejectedValue(new Error('count failed'));

    const context = await resolveValidationRunContext({ flags: {} });
    expect(context).toMatchObject({
      kind: 'affected',
      branchCommitCount: undefined,
    });
  });

  it('includes changed files for local scope without resolving Moon projects', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'local',
      testMode: 'related',
      downstream: 'none',
    });

    await expect(resolveValidationRunContext({ flags: {} })).resolves.toEqual({
      kind: 'affected',
      contract: {
        profile: 'branch',
        scope: 'local',
        testMode: 'related',
        downstream: 'none',
      },
      resolvedBase: undefined,
      branchCommitCount: undefined,
      changedFiles: ['packages/foo/src/index.ts'],
    });

    expect(mockGetAffectedMoonProjectsFromChangedFiles).not.toHaveBeenCalled();
    expect(mockGetMoonChangedFiles).toHaveBeenCalledWith({
      scope: 'local',
      base: undefined,
      head: undefined,
    });
  });

  it('emits a warning when Moon reports no changed files in a shallow repository', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'quick',
      scope: 'local',
      testMode: 'related',
      downstream: 'none',
    });
    mockGetMoonChangedFiles.mockResolvedValue([]);
    mockIsShallowRepository.mockResolvedValue(true);
    const warning = jest.fn();

    await expect(resolveValidationRunContext({ flags: {}, onWarning: warning })).resolves.toEqual({
      kind: 'affected',
      contract: {
        profile: 'quick',
        scope: 'local',
        testMode: 'related',
        downstream: 'none',
      },
      resolvedBase: undefined,
      branchCommitCount: undefined,
      changedFiles: [],
    });

    expect(warning).toHaveBeenCalledWith(
      'Moon reported no changed files for scope=local, but this repository is shallow. A full Git history is required for affected validation; run `git fetch --unshallow`.'
    );
  });
});

describe('resolveValidationAffectedProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('summarizes Moon-affected projects from pre-resolved changed files', async () => {
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([
      { id: 'foo', sourceRoot: 'packages/foo' },
      { id: 'kibana', sourceRoot: '.' },
    ]);
    mockSummarizeAffectedMoonProjects.mockReturnValue({
      sourceRoots: ['packages/foo'],
      isRootProjectAffected: false,
    });

    const changedFilesJson = JSON.stringify({ files: ['packages/foo/src/bar.ts'] });

    await expect(
      resolveValidationAffectedProjects({
        changedFilesJson,
        downstream: 'none',
      })
    ).resolves.toEqual({
      affectedSourceRoots: ['packages/foo'],
      isRootProjectAffected: false,
    });

    expect(mockGetAffectedMoonProjectsFromChangedFiles).toHaveBeenCalledWith({
      changedFilesJson,
      downstream: 'none',
    });
    expect(mockSummarizeAffectedMoonProjects).toHaveBeenCalledWith([
      { id: 'foo', sourceRoot: 'packages/foo' },
      { id: 'kibana', sourceRoot: '.' },
    ]);
  });

  it('preserves root-only affected results for wide-scope fallback decisions', async () => {
    mockGetAffectedMoonProjectsFromChangedFiles.mockResolvedValue([
      { id: 'kibana', sourceRoot: '.' },
    ]);
    mockSummarizeAffectedMoonProjects.mockReturnValue({
      sourceRoots: [],
      isRootProjectAffected: true,
    });

    await expect(
      resolveValidationAffectedProjects({
        changedFilesJson: JSON.stringify({ files: ['tsconfig.json'] }),
      })
    ).resolves.toEqual({
      affectedSourceRoots: [],
      isRootProjectAffected: true,
    });
  });
});
