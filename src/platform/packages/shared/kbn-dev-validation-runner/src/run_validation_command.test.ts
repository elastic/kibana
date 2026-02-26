/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseAndResolveValidationContract } from '@kbn/dev-utils';

import {
  assertNoValidationRunFlagsForDirectTarget,
  resolveValidationRunContext,
} from './resolve_validation_run_context';
import {
  describeValidationScoping,
  resolveValidationBaseContext,
  runValidationCommand,
  runValidationSuite,
  type ValidationBaseContext,
} from './run_validation_command';

jest.mock('@kbn/dev-utils', () => ({
  parseAndResolveValidationContract: jest.fn(),
}));

jest.mock('./resolve_validation_run_context', () => ({
  assertNoValidationRunFlagsForDirectTarget: jest.fn(),
  resolveValidationRunContext: jest.fn(),
}));

const mockParseAndResolveValidationContract = parseAndResolveValidationContract as jest.Mock;
const mockAssertNoValidationRunFlagsForDirectTarget =
  assertNoValidationRunFlagsForDirectTarget as jest.Mock;
const mockResolveValidationRunContext = resolveValidationRunContext as jest.Mock;

const directTargetContext: ValidationBaseContext = {
  mode: 'direct_target',
  directTarget: '/repo/packages/foo/tsconfig.json',
  contract: {
    profile: 'branch',
    scope: 'branch',
    testMode: 'affected',
    downstream: 'none',
  },
};

describe('resolveValidationBaseContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParseAndResolveValidationContract.mockReturnValue({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
    });
    mockResolveValidationRunContext.mockResolvedValue({
      kind: 'affected',
      contract: {
        profile: 'branch',
        scope: 'branch',
        testMode: 'affected',
        downstream: 'none',
      },
      comparison: {
        base: 'base-sha',
        baseRef: 'upstream/main',
        head: 'HEAD',
        headRef: 'HEAD',
      },
      affectedSourceRoots: ['packages/foo'],
      isRootProjectAffected: false,
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
    expect(mockParseAndResolveValidationContract).toHaveBeenCalledWith({});
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
        comparison: {
          base: 'base-sha',
          baseRef: 'upstream/main',
          head: 'HEAD',
          headRef: 'HEAD',
        },
        affectedSourceRoots: ['packages/foo'],
        isRootProjectAffected: false,
      },
    });

    expect(mockResolveValidationRunContext).toHaveBeenCalledWith({
      flags: { profile: 'quick' },
      runnerDescription: 'type check',
      onWarning: undefined,
    });
    expect(mockParseAndResolveValidationContract).not.toHaveBeenCalled();
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
            comparison: {
              base: '2365cc0e7c29d5cc2324cd078a9854866e01e007',
              baseRef: 'upstream/main',
              head: 'HEAD',
              headRef: 'HEAD',
            },
            branchCommitCount: 1,
            affectedSourceRoots: ['packages/foo'],
            isRootProjectAffected: false,
          },
        },
        targetCount: 3,
      })
    ).toBe(
      'Checking 3 projects affected by 1 commit between upstream/main (2365cc0e7c29) and HEAD (scope=branch, test-mode=affected, downstream=none).'
    );
  });
});

describe('runValidationCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs lifecycle hooks and returns execution result', async () => {
    const beforeExecute = jest.fn();
    const execute = jest.fn().mockResolvedValue('done');
    const afterExecute = jest.fn();

    await expect(
      runValidationCommand({
        baseContext: directTargetContext,
        beforeExecute,
        execute,
        afterExecute,
      })
    ).resolves.toBe('done');

    expect(beforeExecute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(afterExecute).toHaveBeenCalledWith(directTargetContext, {
      status: 'success',
      result: 'done',
    });
  });

  it('preserves execution failure when afterExecute also fails', async () => {
    const executeError = new Error('execute failed');
    const afterExecuteError = new Error('afterExecute failed');
    const execute = jest.fn().mockRejectedValue(executeError);
    const afterExecute = jest.fn().mockRejectedValue(afterExecuteError);

    await expect(
      runValidationCommand({
        baseContext: directTargetContext,
        execute,
        afterExecute,
      })
    ).rejects.toThrow('Validation command failed and afterExecute hook also failed.');
  });
});

const suiteBaseContext: ValidationBaseContext = {
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
    comparison: {
      base: 'base-sha',
      baseRef: 'upstream/main',
      head: 'HEAD',
      headRef: 'HEAD',
    },
    affectedSourceRoots: ['packages/foo'],
    isRootProjectAffected: false,
  },
};

describe('runValidationSuite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates tool outcomes from shared base context', async () => {
    const result = await runValidationSuite({
      baseContext: suiteBaseContext,
      tools: [
        {
          name: 'type_check',
          execute: jest.fn().mockResolvedValue('type_check_done'),
        },
        {
          name: 'eslint',
          execute: jest.fn().mockRejectedValue(new Error('eslint failed')),
        },
        {
          name: 'jest',
          execute: jest.fn().mockResolvedValue('jest_done'),
        },
      ],
    });

    expect(result.hasFailures).toBe(true);
    expect(result.results).toEqual([
      {
        toolName: 'type_check',
        outcome: {
          status: 'success',
          result: 'type_check_done',
        },
      },
      {
        toolName: 'eslint',
        outcome: {
          status: 'failed',
          error: expect.any(Error),
        },
      },
      {
        toolName: 'jest',
        outcome: {
          status: 'success',
          result: 'jest_done',
        },
      },
    ]);
  });

  it('stops suite execution after first failure when stopOnError is true', async () => {
    const firstTool = jest.fn().mockRejectedValue(new Error('type_check failed'));
    const secondTool = jest.fn().mockResolvedValue('eslint_done');

    const result = await runValidationSuite({
      baseContext: suiteBaseContext,
      stopOnError: true,
      tools: [
        {
          name: 'type_check',
          execute: firstTool,
        },
        {
          name: 'eslint',
          execute: secondTool,
        },
      ],
    });

    expect(firstTool).toHaveBeenCalledTimes(1);
    expect(secondTool).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(1);
    expect(result.hasFailures).toBe(true);
  });
});
