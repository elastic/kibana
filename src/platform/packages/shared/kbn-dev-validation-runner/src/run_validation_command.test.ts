/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assertNoValidationRunFlagsForDirectTarget,
  resolveValidationRunContext,
} from './resolve_validation_run_context';
import {
  describeValidationScoping,
  resolveValidationBaseContext,
  type ValidationBaseContext,
} from './run_validation_command';

jest.mock('@kbn/dev-utils', () => ({
  parseAndResolveValidationContract: jest.fn(),
}));

jest.mock('./resolve_validation_run_context', () => ({
  assertNoValidationRunFlagsForDirectTarget: jest.fn(),
  resolveValidationRunContext: jest.fn(),
}));

const mockAssertNoValidationRunFlagsForDirectTarget =
  assertNoValidationRunFlagsForDirectTarget as jest.Mock;
const mockResolveValidationRunContext = resolveValidationRunContext as jest.Mock;

const directTargetContext: ValidationBaseContext = {
  mode: 'direct_target',
  directTarget: '/repo/packages/foo/tsconfig.json',
};

describe('resolveValidationBaseContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveValidationRunContext.mockResolvedValue({
      kind: 'affected',
      contract: {
        profile: 'branch',
        scope: 'branch',
        testMode: 'affected',
        downstream: 'none',
      },
      resolvedBase: {
        base: 'base-sha',
        baseRef: 'upstream/main',
      },
      changedFiles: ['packages/foo/src/index.ts'],
    });
  });

  it('uses direct-target mode without resolving Moon/Git context', async () => {
    await expect(
      resolveValidationBaseContext({
        flags: {},
        directTarget: '/repo/packages/foo/tsconfig.json',
      })
    ).resolves.toEqual(directTargetContext);

    expect(mockAssertNoValidationRunFlagsForDirectTarget).toHaveBeenCalledWith({});
    expect(mockResolveValidationRunContext).not.toHaveBeenCalled();
  });

  it('uses contract mode when no direct target is provided', async () => {
    await expect(
      resolveValidationBaseContext({
        flags: { profile: 'quick' },
        runnerDescription: 'type check',
      })
    ).resolves.toEqual({
      mode: 'contract',
      contract: {
        profile: 'branch',
        scope: 'branch',
        testMode: 'affected',
        downstream: 'none',
      },
      runContext: {
        kind: 'affected',
        contract: {
          profile: 'branch',
          scope: 'branch',
          testMode: 'affected',
          downstream: 'none',
        },
        resolvedBase: {
          base: 'base-sha',
          baseRef: 'upstream/main',
        },
        changedFiles: ['packages/foo/src/index.ts'],
      },
    });

    expect(mockResolveValidationRunContext).toHaveBeenCalledWith({
      flags: { profile: 'quick' },
      runnerDescription: 'type check',
      onWarning: undefined,
    });
  });
});

describe('describeValidationScoping', () => {
  it('formats branch-scoped moon-limited summaries', () => {
    expect(
      describeValidationScoping({
        baseContext: {
          mode: 'contract',
          contract: {
            profile: 'branch',
            scope: 'branch',
            testMode: 'affected',
            downstream: 'none',
          },
          runContext: {
            kind: 'affected',
            contract: {
              profile: 'branch',
              scope: 'branch',
              testMode: 'affected',
              downstream: 'none',
            },
            resolvedBase: {
              base: '2365cc0e7c29d5cc2324cd078a9854866e01e007',
              baseRef: 'upstream/main',
            },
            branchCommitCount: 1,
            changedFiles: [],
          },
        },
        targetCount: 3,
      })
    ).toBe(
      'Checking 3 projects affected by 1 commit between upstream/main (2365cc0e7c29) and HEAD (scope=branch, test-mode=affected, downstream=none).'
    );
  });

  it('omits contract summary for direct targets', () => {
    expect(
      describeValidationScoping({
        baseContext: {
          mode: 'direct_target',
          directTarget: '/repo/packages/foo/tsconfig.json',
        },
        targetCount: 1,
      })
    ).toBe('Checking 1 project from direct target /repo/packages/foo/tsconfig.json.');
  });
});
