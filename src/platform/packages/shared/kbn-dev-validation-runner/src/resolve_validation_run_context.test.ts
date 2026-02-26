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
  parseAndResolveValidationContract,
} from '@kbn/dev-utils';
import {
  getAffectedMoonProjects,
  resolveMoonAffectedComparison,
  summarizeAffectedMoonProjects,
} from '@kbn/moon';

import {
  assertNoValidationRunFlagsForDirectTarget,
  resolveValidationRunContext,
} from './resolve_validation_run_context';

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: (message: string) => new Error(message),
}));

jest.mock('@kbn/dev-utils', () => ({
  countCommitsBetweenRefs: jest.fn(),
  hasStagedChanges: jest.fn(),
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
  getAffectedMoonProjects: jest.fn(),
  resolveMoonAffectedComparison: jest.fn(),
  summarizeAffectedMoonProjects: jest.fn(),
}));

const mockParseAndResolveValidationContract = parseAndResolveValidationContract as jest.Mock;
const mockHasStagedChanges = hasStagedChanges as jest.Mock;
const mockResolveMoonAffectedComparison = resolveMoonAffectedComparison as jest.Mock;
const mockCountCommitsBetweenRefs = countCommitsBetweenRefs as jest.Mock;
const mockGetAffectedMoonProjects = getAffectedMoonProjects as jest.Mock;
const mockSummarizeAffectedMoonProjects = summarizeAffectedMoonProjects as jest.Mock;

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
    mockSummarizeAffectedMoonProjects.mockReturnValue({
      sourceRoots: ['packages/foo'],
      isRootProjectAffected: false,
    });
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
    expect(mockGetAffectedMoonProjects).not.toHaveBeenCalled();
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
    expect(mockResolveMoonAffectedComparison).not.toHaveBeenCalled();
  });

  it('falls back to full context and emits warning when branch comparison fails', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
      baseRef: undefined,
      headRef: undefined,
    });
    mockResolveMoonAffectedComparison.mockRejectedValue(new Error('merge-base failed'));
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
  });

  it('returns affected context with branch change count and non-root source roots', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
      baseRef: undefined,
      headRef: undefined,
    });
    mockResolveMoonAffectedComparison.mockResolvedValue({
      base: 'base-sha',
      baseRef: 'upstream/main',
      head: 'HEAD',
      headRef: 'HEAD',
    });
    mockCountCommitsBetweenRefs.mockResolvedValue(4);
    mockGetAffectedMoonProjects.mockResolvedValue([
      { id: 'foo', sourceRoot: 'packages/foo' },
      { id: 'kibana', sourceRoot: '.' },
    ]);
    mockSummarizeAffectedMoonProjects.mockReturnValue({
      sourceRoots: ['packages/foo'],
      isRootProjectAffected: false,
    });

    await expect(resolveValidationRunContext({ flags: {} })).resolves.toEqual({
      kind: 'affected',
      contract: {
        profile: 'branch',
        scope: 'branch',
        testMode: 'affected',
        downstream: 'none',
        baseRef: undefined,
        headRef: undefined,
      },
      comparison: {
        base: 'base-sha',
        baseRef: 'upstream/main',
        head: 'HEAD',
        headRef: 'HEAD',
      },
      branchCommitCount: 4,
      affectedSourceRoots: ['packages/foo'],
      isRootProjectAffected: false,
    });
  });

  it('keeps branch change count undefined when count lookup fails', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
    });
    mockResolveMoonAffectedComparison.mockResolvedValue({
      base: 'base-sha',
      baseRef: 'upstream/main',
      head: 'HEAD',
      headRef: 'HEAD',
    });
    mockCountCommitsBetweenRefs.mockRejectedValue(new Error('count failed'));
    mockGetAffectedMoonProjects.mockResolvedValue([{ id: 'foo', sourceRoot: 'packages/foo' }]);
    mockSummarizeAffectedMoonProjects.mockReturnValue({
      sourceRoots: ['packages/foo'],
      isRootProjectAffected: false,
    });

    const context = await resolveValidationRunContext({ flags: {} });
    expect(context).toMatchObject({
      kind: 'affected',
      branchCommitCount: undefined,
    });
  });

  it('marks root-only affected results for wide-scope fallback decisions', async () => {
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'local',
      testMode: 'related',
      downstream: 'none',
    });
    mockGetAffectedMoonProjects.mockResolvedValue([{ id: 'kibana', sourceRoot: '.' }]);
    mockSummarizeAffectedMoonProjects.mockReturnValue({
      sourceRoots: [],
      isRootProjectAffected: true,
    });

    await expect(resolveValidationRunContext({ flags: {} })).resolves.toEqual({
      kind: 'affected',
      contract: {
        profile: 'branch',
        scope: 'local',
        testMode: 'related',
        downstream: 'none',
      },
      comparison: undefined,
      branchCommitCount: undefined,
      affectedSourceRoots: [],
      isRootProjectAffected: true,
    });
  });
});
