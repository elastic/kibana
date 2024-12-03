/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface RenovatePackageRule {
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
  return (
    // Only include rules that are enabled
    rule.enabled !== false &&
    // Only include rules that have a team reviewer
    rule.reviewers?.some((reviewer) => reviewer.startsWith('team:'))
  );
}

// Filter packages that do not require ownership.
export function packageFilter(pkg: string) {
  return (
    // @kbn-* packages are internal to this repo, and do not require ownership via renovate
    !pkg.startsWith('@kbn/') &&
    // The EUI team owns the EUI package, and it is not covered by renovate
    pkg !== '@elastic/eui'
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
