/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import nodePath from 'path';

// @ts-ignore
import { REPO_ROOT } from '@kbn/repo-info';

interface PackageRule {
  matchDepNames?: string[];
  matchPackageNames?: string[];
  matchDepPatterns?: string[];
  reviewers?: string[];
  enabled?: boolean;
  groupName?: string;
}

interface RenovateConfig {
  packageRules?: PackageRule[];
}

export interface RenovateMatch {
  team: string | null;
  group: string | null;
  orphan: boolean;
}

// "team:kibana-operations" → "elastic/kibana-operations"
function normalizeTeam(reviewer: string): string {
  return reviewer.startsWith('team:') ? `elastic/${reviewer.slice(5)}` : reviewer;
}

function ruleMatchesDep(rule: PackageRule, dep: string): boolean {
  const exactNames = [...(rule.matchDepNames ?? []), ...(rule.matchPackageNames ?? [])];
  if (exactNames.includes(dep)) return true;

  if (rule.matchDepPatterns) {
    return rule.matchDepPatterns.some((pattern) => {
      try {
        return new RegExp(pattern).test(dep);
      } catch {
        return false;
      }
    });
  }

  return false;
}

/**
 * Returns a function that, given a dep name, returns its renovate reviewer team
 * and group, or marks it as an orphan if no enabled rule covers it.
 */
export function buildRenovateMatcher(
  renovatePath?: string
): (dep: string) => RenovateMatch {
  const configPath = renovatePath ?? nodePath.join(REPO_ROOT, 'renovate.json');
  let config: RenovateConfig = {};
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    // no config found — everything will be an orphan
  }

  // Only keep rules that are explicitly enabled and have reviewers.
  // The first rule {"matchDepPatterns": [".*"], "enabled": false} acts as a
  // global disable; specific rules then opt packages in with "enabled": true.
  const enabledRules = (config.packageRules ?? []).filter(
    (r) => r.enabled !== false && (r.reviewers?.length ?? 0) > 0
  );

  return (dep: string): RenovateMatch => {
    const match = enabledRules.find((rule) => ruleMatchesDep(rule, dep));
    if (!match) return { team: null, group: null, orphan: true };
    return {
      team: match.reviewers![0] ? normalizeTeam(match.reviewers![0]) : null,
      group: match.groupName ?? null,
      orphan: false,
    };
  };
}
