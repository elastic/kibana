/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface RenovatePackageRule {
  groupName: string;
  matchPackageNames?: string[];
  matchDepNames?: string[];
  matchPackagePatterns?: string[];
  matchDepPatterns?: string[];
  excludePackageNames?: string[];
  excludePackagePatterns?: string[];
  enabled?: boolean;
  reviewers?: string[];
}

export function ruleFilter(rule: RenovatePackageRule) {
  // Explicit list of rules that are allowed to be disabled.
  const allowedDisabledRules = [
    'bazel', // Per operations team. This is slated for removal, and does not make sense to track.
    'typescript', // These updates are always handled manually
    'webpack', // While we are in the middle of a webpack upgrade. TODO: Remove this once we are done.
  ];
  return (
    // Only include rules that are enabled or explicitly allowed to be disabled
    (allowedDisabledRules.includes(rule.groupName) || rule.enabled !== false) &&
    // Only include rules that have a team reviewer
    rule.reviewers?.some((reviewer) => reviewer.startsWith('team:'))
  );
}

// Filter packages that do not require ownership.
export function packageFilter(pkg: string) {
  return (
    // @kbn-* packages are internal to this repo, and do not require ownership via renovate
    !pkg.startsWith('@kbn/') &&
    // The EUI team owns the EUI packages, and are not covered by renovate
    pkg !== '@elastic/eui' &&
    pkg !== '@elastic/eui-amsterdam' &&
    pkg !== '@elastic/eui-theme-borealis' &&
    // Operations owns node, and is not covered by renovate
    pkg !== '@types/node'
  );
}

export function ruleCoversDependency(rule: RenovatePackageRule, dependency: string): boolean {
  const {
    matchPackageNames = [],
    matchPackagePatterns = [],
    matchDepNames = [],
    matchDepPatterns = [],
    excludePackageNames = [],
    excludePackagePatterns = [],
  } = rule;

  const packageIncluded =
    matchPackageNames.includes(dependency) ||
    matchDepNames.includes(dependency) ||
    matchPackagePatterns.some((pattern) => new RegExp(pattern).test(dependency)) ||
    matchDepPatterns.some((pattern) => new RegExp(pattern).test(dependency));

  const packageExcluded =
    excludePackageNames.includes(dependency) ||
    excludePackagePatterns.some((pattern) => new RegExp(pattern).test(dependency));

  return packageIncluded && !packageExcluded;
}
