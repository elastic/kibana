/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { relative } from 'path';
import type { Distribution } from '../baseline/select_baseline';

export interface GovernanceResult {
  allowed: boolean;
  reason?: string;
}

const BREAKING_CHANGE_LABEL = 'breaking-change-approved';

const isPrContext = (): boolean => Boolean(process.env.GITHUB_PR_NUMBER);

const hasLabel = (label: string): boolean => {
  const labels = process.env.GITHUB_PR_LABELS ?? '';
  return labels.split(',').includes(label);
};

const getMergeBase = (): string | null => {
  const cached = process.env.GITHUB_PR_MERGE_BASE;
  if (cached) return cached;

  const targetBranch = process.env.GITHUB_PR_TARGET_BRANCH;
  if (!targetBranch) return null;

  try {
    execSync(`git fetch origin ${targetBranch}`, { stdio: 'pipe' });
    return execSync('git merge-base HEAD FETCH_HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
};

const getChangedFiles = (mergeBase: string): string[] => {
  try {
    const output = execSync(`git diff --name-only ${mergeBase}...HEAD`, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const isBaselineModified = (baselinePath: string, changedFiles: string[]): boolean => {
  const relativePath = relative(process.cwd(), baselinePath);
  return changedFiles.some((file) => file === relativePath || file.startsWith(relativePath));
};

export const checkBaselineGovernance = (
  distribution: Distribution,
  baselinePath: string
): GovernanceResult => {
  if (!isPrContext()) {
    return { allowed: true };
  }

  const mergeBase = getMergeBase();
  if (!mergeBase) {
    return { allowed: true };
  }

  const changedFiles = getChangedFiles(mergeBase);
  if (!isBaselineModified(baselinePath, changedFiles)) {
    return { allowed: true };
  }

  if (distribution === 'serverless') {
    return {
      allowed: false,
      reason: `Serverless API baseline may only be updated by the post-promotion pipeline.

The file '${baselinePath}' cannot be modified in a PR.
If you need to update the serverless baseline, please coordinate with the release team.`,
    };
  }

  if (!hasLabel(BREAKING_CHANGE_LABEL)) {
    return {
      allowed: false,
      reason: `Stack API baseline modifications require the '${BREAKING_CHANGE_LABEL}' label.

This PR modifies stack API baselines which indicates a breaking change.
Please:
  1. Ensure this breaking change has been approved
  2. Add the '${BREAKING_CHANGE_LABEL}' label to this PR
  3. Re-run this check`,
    };
  }

  return { allowed: true };
};
