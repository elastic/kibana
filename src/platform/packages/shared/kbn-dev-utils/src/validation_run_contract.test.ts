/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  parseAndResolveValidationContract,
  VALIDATION_PROFILE_DEFAULTS,
} from './validation_run_contract';

describe('VALIDATION_PROFILE_DEFAULTS', () => {
  it('defines expected defaults for each profile', () => {
    expect(VALIDATION_PROFILE_DEFAULTS).toEqual({
      precommit: {
        scope: 'staged',
        testMode: 'related',
        downstream: 'none',
      },
      quick: {
        scope: 'local',
        testMode: 'related',
        downstream: 'none',
      },
      agent: {
        scope: 'local',
        testMode: 'related',
        downstream: 'none',
      },
      branch: {
        scope: 'branch',
        testMode: 'affected',
        downstream: 'none',
      },
      pr: {
        scope: 'branch',
        testMode: 'affected',
        downstream: 'deep',
      },
      full: {
        scope: 'full',
        testMode: 'all',
        downstream: 'none',
      },
    });
  });
});

describe('parseAndResolveValidationContract', () => {
  it('defaults to branch profile/scope when no flags are provided', () => {
    expect(parseAndResolveValidationContract({})).toEqual({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
      baseRef: undefined,
      headRef: 'HEAD',
    });
  });

  it('applies profile defaults and explicit overrides', () => {
    expect(
      parseAndResolveValidationContract({
        profile: 'quick',
        downstream: 'direct',
      })
    ).toEqual({
      profile: 'quick',
      scope: 'local',
      testMode: 'related',
      downstream: 'direct',
      baseRef: undefined,
      headRef: undefined,
    });
  });

  it('supports the agent profile with quick defaults', () => {
    expect(
      parseAndResolveValidationContract({
        profile: 'agent',
      })
    ).toEqual({
      profile: 'agent',
      scope: 'local',
      testMode: 'related',
      downstream: 'none',
      baseRef: undefined,
      headRef: undefined,
    });
  });

  it('allows any test-mode with any scope independently', () => {
    expect(
      parseAndResolveValidationContract({
        scope: 'branch',
        testMode: 'all',
      })
    ).toEqual({
      profile: 'branch',
      scope: 'branch',
      testMode: 'all',
      downstream: 'none',
      baseRef: undefined,
      headRef: 'HEAD',
    });
  });

  it('trims and normalizes ref flags', () => {
    expect(
      parseAndResolveValidationContract({
        scope: 'branch',
        baseRef: ' origin/main ',
        headRef: ' HEAD ',
      })
    ).toEqual({
      profile: 'branch',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'none',
      baseRef: 'origin/main',
      headRef: 'HEAD',
    });
  });

  it('throws for unsupported flag values', () => {
    expect(() => parseAndResolveValidationContract({ profile: 'fast' })).toThrow(
      "Unsupported --profile value 'fast'. Expected one of: precommit, quick, agent, branch, pr, full."
    );
    expect(() => parseAndResolveValidationContract({ scope: 'workspace' })).toThrow(
      "Unsupported --scope value 'workspace'. Expected one of: staged, local, branch, full."
    );
    expect(() => parseAndResolveValidationContract({ testMode: 'delta' })).toThrow(
      "Unsupported --test-mode value 'delta'. Expected one of: related, affected, all."
    );
    expect(() => parseAndResolveValidationContract({ downstream: 'all' })).toThrow(
      "Unsupported --downstream value 'all'. Expected one of: none, direct, deep."
    );
  });

  it('rejects refs outside branch scope', () => {
    expect(() =>
      parseAndResolveValidationContract({
        scope: 'local',
        baseRef: 'origin/main',
      })
    ).toThrow('--base-ref can only be used when --scope is branch.');

    expect(() =>
      parseAndResolveValidationContract({
        scope: 'staged',
        headRef: 'HEAD~1',
      })
    ).toThrow('--head-ref can only be used when --scope is branch.');
  });
});
