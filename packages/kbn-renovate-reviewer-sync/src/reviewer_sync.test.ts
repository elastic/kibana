/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RenovateConfig } from './reviewer_sync';
import {
  computeReviewersForPackages,
  convertTeamFormat,
  getRulePackages,
  normalizeSortedUnique,
  sameStringSet,
  syncReviewersInConfig,
} from './reviewer_sync';

describe('reviewer sync', () => {
  it('convertTeamFormat converts @elastic/foo to team:foo', () => {
    expect(convertTeamFormat('@elastic/kibana-core')).toEqual('team:kibana-core');
    expect(convertTeamFormat('@elastic/something')).toEqual('team:something');
  });

  it('normalizeSortedUnique sorts and de-dupes', () => {
    expect(normalizeSortedUnique(['b', 'a', 'a'])).toEqual(['a', 'b']);
  });

  it('sameStringSet compares sets order-insensitively', () => {
    expect(sameStringSet(['b', 'a'], ['a', 'b'])).toEqual(true);
    expect(sameStringSet(['a'], ['a', 'b'])).toEqual(false);
    expect(sameStringSet(undefined, [])).toEqual(true);
  });

  it('getRulePackages collects matchDepNames + matchPackageNames and filters to known packages', () => {
    const knownPackages = new Set(['lodash', 'react', '@elastic/eui']);

    expect(
      getRulePackages(
        {
          matchDepNames: ['lodash', 'unknown'],
          matchPackageNames: ['@elastic/eui', 'unknown2'],
        },
        knownPackages
      )
    ).toEqual(['@elastic/eui', 'lodash']);
  });

  it('computeReviewersForPackages unions teams across packages and normalizes format', () => {
    const packageToTeams = new Map<string, string[]>([
      ['lodash', ['@elastic/kibana-core']],
      ['react', ['@elastic/kibana-core', '@elastic/kibana-presentation']],
    ]);

    expect(computeReviewersForPackages(['lodash', 'react'], packageToTeams)).toEqual([
      'team:kibana-core',
      'team:kibana-presentation',
    ]);
  });

  it('syncReviewersInConfig does not clobber rules when computed reviewers are empty', () => {
    const renovateConfig: RenovateConfig = {
      packageRules: [
        {
          matchPackageNames: ['lodash'],
          reviewers: ['team:some-manual-team'],
        },
      ],
    };

    const report = syncReviewersInConfig({
      renovateConfig,
      knownPackages: new Set(['lodash']),
      packageToTeams: new Map([['lodash', []]]), // no teams computed
      applyChanges: true,
    });

    expect(report.rulesWithNoComputedReviewers).toEqual(1);
    expect(report.rulesWithNoComputedReviewersDetails).toEqual([
      {
        index: 0,
        mode: 'report',
        packages: ['lodash'],
        before: ['team:some-manual-team'],
      },
    ]);
    expect(report.updatedRules).toEqual(0);
    expect(renovateConfig.packageRules?.[0].reviewers).toEqual(['team:some-manual-team']);
  });

  it('syncReviewersInConfig respects x_kbn_reviewer_sync.mode=fixed and does not update reviewers', () => {
    const renovateConfig: RenovateConfig = {
      packageRules: [
        {
          matchPackageNames: ['lodash'],
          reviewers: ['team:maintainers'],
          x_kbn_reviewer_sync: { mode: 'fixed', reason: 'Maintainer-owned rule' },
        },
      ],
    };

    const report = syncReviewersInConfig({
      renovateConfig,
      knownPackages: new Set(['lodash']),
      packageToTeams: new Map([['lodash', ['@elastic/kibana-core']]]),
      applyChanges: true,
    });

    expect(report.rulesFixedByOverride).toEqual(1);
    expect(report.updatedRules).toEqual(0);
    expect(report.ruleDrift).toHaveLength(0);
    expect(report.rulesWithNoComputedReviewersDetails).toEqual([]);
    expect(renovateConfig.packageRules?.[0].reviewers).toEqual(['team:maintainers']);
  });

  it('syncReviewersInConfig reports drift for rules without x_kbn_reviewer_sync and does not update them even if applyChanges=true', () => {
    const renovateConfig: RenovateConfig = {
      packageRules: [
        {
          matchDepNames: ['lodash', 'react'],
          reviewers: ['team:old'],
        },
      ],
    };

    const report = syncReviewersInConfig({
      renovateConfig,
      knownPackages: new Set(['lodash', 'react']),
      packageToTeams: new Map([
        ['lodash', ['@elastic/kibana-core']],
        ['react', ['@elastic/kibana-presentation']],
      ]),
      applyChanges: true,
    });

    expect(report.reportOnlyRulesWithDrift).toEqual(1);
    expect(report.ruleDrift).toHaveLength(1);
    expect(report.updatedRules).toEqual(0);
    expect(report.rulesWithNoComputedReviewersDetails).toEqual([]);
    expect(renovateConfig.packageRules?.[0].reviewers).toEqual(['team:old']);
  });

  it('syncReviewersInConfig updates reviewers when x_kbn_reviewer_sync.mode=sync and applyChanges=true, without reporting drift', () => {
    const renovateConfig: RenovateConfig = {
      packageRules: [
        {
          matchDepNames: ['lodash', 'react'],
          reviewers: ['team:old'],
          x_kbn_reviewer_sync: { mode: 'sync' },
        },
      ],
    };

    const report = syncReviewersInConfig({
      renovateConfig,
      knownPackages: new Set(['lodash', 'react']),
      packageToTeams: new Map([
        ['lodash', ['@elastic/kibana-core']],
        ['react', ['@elastic/kibana-presentation']],
      ]),
      applyChanges: true,
    });

    expect(report.updatedRules).toEqual(1);
    expect(report.managedSyncNeeded).toEqual(1);
    expect(report.ruleDrift).toHaveLength(0);
    expect(report.managedRuleDrift).toHaveLength(1);
    expect(report.rulesWithNoComputedReviewersDetails).toEqual([]);
    expect(report.managedRuleDrift[0]).toEqual({
      index: 0,
      packages: ['lodash', 'react'],
      before: ['team:old'],
      after: ['team:kibana-core', 'team:kibana-presentation'],
    });
    expect(renovateConfig.packageRules?.[0].reviewers).toEqual([
      'team:kibana-core',
      'team:kibana-presentation',
    ]);
  });

  it('syncReviewersInConfig reports missing coverage for packages used in code but not referenced by any rule', () => {
    const renovateConfig: RenovateConfig = {
      packageRules: [
        {
          matchPackageNames: ['lodash'],
          reviewers: ['team:kibana-core'],
        },
      ],
    };

    const report = syncReviewersInConfig({
      renovateConfig,
      knownPackages: new Set(['lodash', 'react']),
      packageToTeams: new Map([
        ['lodash', ['@elastic/kibana-core']],
        ['react', ['@elastic/kibana-core']], // used, but not covered by rule list
      ]),
      applyChanges: false,
    });

    expect(report.packagesUsedButNotCovered).toEqual(['react']);
  });
});
