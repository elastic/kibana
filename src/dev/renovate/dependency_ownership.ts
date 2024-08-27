/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import minimatch from 'minimatch';

interface RenovatePackageRule {
  matchPackageNames?: string[];
  matchDepNames?: string[];
  matchPackagePatterns?: string[];
  matchDepPatterns?: string[];
  enabled?: boolean;
  reviewers?: string[];
}

// Filter packages that do not require ownership.
function packageFilter(pkg: string) {
  return (
    // @kbn-* packages are internal to this repo, and do not require ownership via renovate
    !pkg.startsWith('@kbn/') &&
    // The EUI team owns the EUI package, and it is not covered by renovate
    pkg !== '@elastic/eui'
  );
}

// Filter rules that do not represent active team ownership.
function ruleFilter(rule: RenovatePackageRule) {
  return (
    // Only include rules that are enabled
    rule.enabled !== false &&
    // Only include rules that have a team reviewer
    rule.reviewers?.some((reviewer) => reviewer.toLowerCase().startsWith('team:'))
  );
}

export const UNKNOWN_OWNER_LABEL = 'Unknown';

export type Scope = 'Prod' | 'Dev';

export interface DependencyOwnership {
  dependency: string;
  scope: Scope;
  owner: string;
}

export function getDependencyOwnership(): DependencyOwnership[] {
  const renovateFile = resolve(REPO_ROOT, 'renovate.json');
  const packageFile = resolve(REPO_ROOT, 'package.json');

  const renovateConfig = JSON.parse(readFileSync(renovateFile, 'utf8'));
  const packageConfig = JSON.parse(readFileSync(packageFile, 'utf8'));

  const renovateRules = (renovateConfig?.packageRules || []).filter(ruleFilter);
  const packageDependencies = Object.keys(packageConfig?.dependencies || {}).filter(packageFilter);
  const packageDevDependencies = Object.keys(packageConfig?.devDependencies || {}).filter(
    packageFilter
  );

  const createDependencyReport = (scope: Scope) => (dependency: string) => {
    const rule = renovateRules.find((candidateRule: RenovatePackageRule) =>
      ruleCoversDependency(candidateRule, dependency)
    );
    return {
      dependency,
      scope,
      owner:
        rule?.reviewers
          ?.filter((reviewer: string) => reviewer.toLowerCase().startsWith('team:'))
          ?.join(', ')
          ?.toLowerCase() || UNKNOWN_OWNER_LABEL,
    };
  };

  return packageDependencies
    .map(createDependencyReport('Prod'))
    .concat(packageDevDependencies.map(createDependencyReport('Dev')));
}

export function getUnusedRenovateRules(): RenovatePackageRule[] {
  const renovateFile = resolve(REPO_ROOT, 'renovate.json');
  const packageFile = resolve(REPO_ROOT, 'package.json');

  const renovateConfig = JSON.parse(readFileSync(renovateFile, 'utf8'));
  const packageConfig = JSON.parse(readFileSync(packageFile, 'utf8'));

  const renovateRules = (renovateConfig?.packageRules || []).filter(ruleFilter);
  const packageDependencies = Object.keys(packageConfig?.dependencies || {}).filter(packageFilter);
  const packageDevDependencies = Object.keys(packageConfig?.devDependencies || {}).filter(
    packageFilter
  );
  const allDependencies = packageDependencies.concat(packageDevDependencies);

  const unusedRules = renovateRules.filter((rule: RenovatePackageRule) => {
    return !allDependencies.some((dependency: string) => ruleCoversDependency(rule, dependency));
  });

  return unusedRules;
}

function ruleCoversDependency(rule: RenovatePackageRule, dependency: string) {
  const {
    matchPackageNames = [],
    matchPackagePatterns = [],
    matchDepNames = [],
    matchDepPatterns = [],
  } = rule;

  const mustMatchPatterns: RegExp[] = matchPackagePatterns
    .concat(matchPackageNames)
    .map((pattern) => {
      if (pattern.startsWith('/')) {
        return new RegExp(pattern.slice(1, pattern.lastIndexOf('/')));
      }
      return false;
    })
    .filter(Boolean) as RegExp[];

  const mustMatchDeps: RegExp[] = matchDepPatterns
    .concat(matchDepNames)
    .map((pattern) => {
      if (pattern.startsWith('/')) {
        return new RegExp(pattern.slice(1, pattern.lastIndexOf('/')));
      }
      return false;
    })
    .filter(Boolean) as RegExp[];

  const ignoreNegatedPatternsForNow = (pattern: string) => !pattern.startsWith('!');

  const packageIncluded =
    matchPackageNames
      .filter(ignoreNegatedPatternsForNow)
      .some((name) => minimatch(dependency, name, { nocase: true })) ||
    matchDepNames
      .filter(ignoreNegatedPatternsForNow)
      .some((name) => minimatch(dependency, name, { nocase: true })) ||
    mustMatchPatterns.some((pattern) => pattern.test(dependency)) ||
    mustMatchDeps.some((pattern) => pattern.test(dependency));

  return packageIncluded;
}
