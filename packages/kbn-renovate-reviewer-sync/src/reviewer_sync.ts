/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ReviewerSyncOverrideMode = 'sync' | 'fixed';

export interface ReviewerSyncOverride {
  /**
   * Opt-in control for how reviewer-sync handles this rule.
   *
   * - `sync`: update reviewers based on code usage + CODEOWNERS (managed by this tool).
   * - `fixed`: never update reviewers for this rule (maintainer-owned / pinned reviewers).
   *
   * If `x_kbn_reviewer_sync` is missing, this tool runs in **report-only** mode for the rule:
   * it may report drift, but will not write updates.
   */
  mode: ReviewerSyncOverrideMode;
  /**
   * Optional free-form rationale, helpful for future maintainers.
   */
  reason?: string;
}

export interface RenovatePackageRule {
  // selectors
  matchPackageNames?: string[];
  matchDepNames?: string[];
  matchDepPatterns?: string[];
  matchManagers?: string[];

  // outputs/policy (we only update reviewers)
  reviewers?: string[];

  /**
   * Kibana-specific reviewer-sync override. Renovate ignores unknown keys.
   */
  x_kbn_reviewer_sync?: ReviewerSyncOverride;

  // misc / common fields (preserved)
  enabled?: boolean;
  description?: string;

  // allow unknown renovate fields without type assertions
  [key: string]: JsonValue | ReviewerSyncOverride | undefined;
}

export interface RenovateConfig {
  $schema?: string;
  extends?: string[];
  ignorePaths?: string[];
  enabledManagers?: string[];
  baseBranches?: string[];
  prConcurrentLimit?: number;
  prHourlyLimit?: number;
  separateMajorMinor?: boolean;
  rangeStrategy?: string;
  semanticCommits?: string;
  vulnerabilityAlerts?: {
    enabled?: boolean;
  };
  lockFileMaintenance?: {
    enabled?: boolean;
  };
  customManagers?: unknown[];
  packageRules?: RenovatePackageRule[];
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

export function normalizeSortedUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

export function convertTeamFormat(team: string): string {
  // @elastic/kibana-core -> team:kibana-core
  return team.replace('@elastic/', 'team:');
}

export function getRulePackages(rule: RenovatePackageRule, knownPackages: Set<string>): string[] {
  const packages: string[] = [];

  if (isStringArray(rule.matchDepNames)) {
    packages.push(...rule.matchDepNames);
  }

  if (isStringArray(rule.matchPackageNames)) {
    packages.push(...rule.matchPackageNames);
  }

  // Only consider packages we can actually map from code -> team
  return normalizeSortedUnique(packages.filter((p) => knownPackages.has(p)));
}

export function computeReviewersForPackages(
  packages: string[],
  packageToTeams: Map<string, string[]>
): string[] {
  const reviewers: string[] = [];

  for (const pkg of packages) {
    const teams = packageToTeams.get(pkg) ?? [];
    reviewers.push(...teams.map(convertTeamFormat));
  }

  return normalizeSortedUnique(reviewers);
}

export function sameStringSet(a: string[] | undefined, b: string[]): boolean {
  if (!a) return b.length === 0;
  const normA = normalizeSortedUnique(a);
  if (normA.length !== b.length) return false;
  return normA.every((v, i) => v === b[i]);
}

export interface ReviewerSyncReport {
  updatedRules: number;
  // explicit overrides
  rulesFixedByOverride: number;
  rulesSyncManaged: number;

  // report-only defaults (no override)
  reportOnlyRulesWithDrift: number;
  rulesWithNoMappablePackages: number;
  rulesWithNoComputedReviewers: number;
  /**
   * Details for rules where we could map packages, but could not compute any reviewers
   * from code usage + CODEOWNERS.
   *
   * We intentionally do not clobber existing reviewers in this case.
   */
  rulesWithNoComputedReviewersDetails: Array<{
    index: number;
    mode: 'sync' | 'report';
    packages: string[];
    before: string[] | undefined;
  }>;
  packagesCoveredByRules: number;
  packagesUsedInCode: number;
  packagesUsedButNotCovered: string[];

  // Detailed drift is only reported for report-only rules (no x_kbn_reviewer_sync).
  ruleDrift: Array<{
    index: number;
    packages: string[];
    before: string[] | undefined;
    after: string[];
  }>;

  // Drift for managed rules (x_kbn_reviewer_sync.mode === 'sync').
  // Useful for CI orchestration that wants to open a PR and route it to the computed reviewers.
  managedRuleDrift: Array<{
    index: number;
    packages: string[];
    before: string[] | undefined;
    after: string[];
  }>;

  // Managed drift (x_kbn_reviewer_sync.mode === 'sync') is tracked separately (not printed as drift by default)
  managedSyncNeeded: number;
}

type EffectiveRuleMode = ReviewerSyncOverrideMode | 'report';

function getEffectiveRuleMode(rule: RenovatePackageRule): EffectiveRuleMode {
  const override = rule.x_kbn_reviewer_sync;
  if (!override) return 'report';
  if (override.mode === 'fixed') return 'fixed';
  if (override.mode === 'sync') return 'sync';
  return 'report';
}

export function syncReviewersInConfig(params: {
  renovateConfig: RenovateConfig;
  knownPackages: Set<string>;
  packageToTeams: Map<string, string[]>;
  applyChanges: boolean;
}): ReviewerSyncReport {
  const { renovateConfig, knownPackages, packageToTeams, applyChanges } = params;

  const rules = renovateConfig.packageRules ?? [];
  const packagesCoveredByRules = new Set<string>();
  const packagesUsedInCode = new Set<string>();

  for (const [pkg, teams] of packageToTeams.entries()) {
    if (teams.length > 0) {
      packagesUsedInCode.add(pkg);
    }
  }

  let updatedRules = 0;
  let rulesFixedByOverride = 0;
  let rulesSyncManaged = 0;

  let reportOnlyRulesWithDrift = 0;
  let rulesWithNoMappablePackages = 0;
  let rulesWithNoComputedReviewers = 0;
  const rulesWithNoComputedReviewersDetails: ReviewerSyncReport['rulesWithNoComputedReviewersDetails'] =
    [];
  const ruleDrift: ReviewerSyncReport['ruleDrift'] = [];
  const managedRuleDrift: ReviewerSyncReport['managedRuleDrift'] = [];
  let managedSyncNeeded = 0;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleMode = getEffectiveRuleMode(rule);
    const packages = getRulePackages(rule, knownPackages);

    for (const p of packages) packagesCoveredByRules.add(p);

    if (packages.length === 0) {
      rulesWithNoMappablePackages++;
      continue;
    }

    if (ruleMode === 'fixed') {
      rulesFixedByOverride++;
      continue;
    }

    const computedReviewers = computeReviewersForPackages(packages, packageToTeams);
    if (computedReviewers.length === 0) {
      // We couldn't compute reviewers from code (package not found in code / unowned files / scan limitations)
      // so we avoid clobbering existing policy.
      rulesWithNoComputedReviewers++;
      // NOTE: `ruleMode` can't be `fixed` here (handled above), but we keep the mode for diagnostics.
      rulesWithNoComputedReviewersDetails.push({
        index: i,
        mode: ruleMode,
        packages,
        before: isStringArray(rule.reviewers) ? rule.reviewers : undefined,
      });
      continue;
    }

    if (
      !sameStringSet(isStringArray(rule.reviewers) ? rule.reviewers : undefined, computedReviewers)
    ) {
      if (ruleMode === 'sync') {
        rulesSyncManaged++;
        managedSyncNeeded++;

        managedRuleDrift.push({
          index: i,
          packages,
          before: isStringArray(rule.reviewers) ? rule.reviewers : undefined,
          after: computedReviewers,
        });

        if (applyChanges) {
          rule.reviewers = computedReviewers;
          updatedRules++;
        }
      } else {
        // report-only mode (no explicit x_kbn_reviewer_sync)
        reportOnlyRulesWithDrift++;
        ruleDrift.push({
          index: i,
          packages,
          before: isStringArray(rule.reviewers) ? rule.reviewers : undefined,
          after: computedReviewers,
        });
      }
    }
  }

  const packagesUsedButNotCovered = normalizeSortedUnique(
    Array.from(packagesUsedInCode).filter((p) => !packagesCoveredByRules.has(p))
  );

  return {
    updatedRules,
    rulesFixedByOverride,
    rulesSyncManaged,
    reportOnlyRulesWithDrift,
    rulesWithNoMappablePackages,
    rulesWithNoComputedReviewers,
    rulesWithNoComputedReviewersDetails,
    packagesCoveredByRules: packagesCoveredByRules.size,
    packagesUsedInCode: packagesUsedInCode.size,
    packagesUsedButNotCovered,
    ruleDrift,
    managedRuleDrift,
    managedSyncNeeded,
  };
}
