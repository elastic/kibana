/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { existsSync } from 'fs';
import execa from 'execa';

import {
  createIndexSnapshotCommit,
  getRemoteDefaultBranchRefs,
  resolveNearestMergeBase,
  type ValidationDownstreamMode,
} from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/repo-info';

export type MoonDownstreamMode = ValidationDownstreamMode;

/** Minimal Moon project metadata needed for affected-source resolution. */
export interface MoonProject {
  id: string;
  sourceRoot: string;
}

/** Derived summary of affected projects for root-project escalation handling. */
export interface MoonAffectedProjectSummary {
  sourceRoots: string[];
  isRootProjectAffected: boolean;
}

/** Resolved base revision metadata for Moon affected queries. */
export interface MoonAffectedBase {
  base: string;
  baseRef: string;
}

/** Resolved base/head revision metadata for Moon affected comparisons. */
export interface MoonAffectedComparison {
  base: string;
  baseRef: string;
  head: string;
  headRef: string;
}

interface MoonQueryProjectsResponse {
  projects: Array<{
    id: string;
    source: string;
    config?: {
      project?: {
        metadata?: {
          sourceRoot?: string;
        };
      };
    };
  }>;
}

/** Arguments for querying affected Moon projects. */
export interface GetAffectedMoonProjectsOptions {
  downstream?: MoonDownstreamMode;
  base?: string;
  head?: string;
}

/** Options for resolving the affected base revision from git state. */
export interface ResolveMoonAffectedBaseOptions {
  headRef?: string;
}

/** Options for resolving branch/staged comparisons for Moon affected queries. */
export interface ResolveMoonAffectedComparisonOptions {
  scope: 'branch' | 'staged';
  baseRef?: string;
  headRef?: string;
}

export const ROOT_MOON_PROJECT_ID = 'kibana';

let moonExecutablePath: string | undefined;

/** Normalizes repository-relative paths to POSIX separators for stable matching. */
export const normalizeRepoRelativePath = (pathValue: string) =>
  Path.normalize(pathValue).split(Path.sep).join('/');

const normalizeRevision = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const getMoonExecutablePath = async () => {
  if (moonExecutablePath) {
    return moonExecutablePath;
  }

  const moonBinPath = Path.resolve(REPO_ROOT, 'node_modules/.bin/moon');
  if (existsSync(moonBinPath)) {
    moonExecutablePath = moonBinPath;
    return moonExecutablePath;
  }

  const { stdout } = await execa('yarn', ['--silent', 'which', 'moon'], {
    cwd: REPO_ROOT,
    stdin: 'ignore',
  });

  moonExecutablePath = stdout.trim();
  return moonExecutablePath;
};

/** Resolves the base revision used for Moon affected comparisons. */
export const resolveMoonAffectedBase = async ({
  headRef = 'HEAD',
}: ResolveMoonAffectedBaseOptions = {}): Promise<MoonAffectedBase> => {
  const envBase = process.env.GITHUB_PR_MERGE_BASE?.trim();
  if (envBase) {
    return {
      base: envBase,
      baseRef: 'GITHUB_PR_MERGE_BASE',
    };
  }

  const baseRefs = await getRemoteDefaultBranchRefs();
  if (baseRefs.length === 0) {
    throw new Error(
      'Unable to resolve a remote default branch for affected type check. Set GITHUB_PR_MERGE_BASE to override.'
    );
  }

  const bestCandidate = await resolveNearestMergeBase({
    baseRefs,
    headRef,
  });
  if (!bestCandidate) {
    throw new Error(
      `Unable to resolve merge-base for affected type check from remote default branches: ${baseRefs.join(
        ', '
      )}.`
    );
  }

  return {
    base: bestCandidate.mergeBase,
    baseRef: bestCandidate.baseRef,
  };
};

/** Resolves base/head revisions for Moon affected queries in branch or staged scope. */
export const resolveMoonAffectedComparison = async ({
  scope,
  baseRef,
  headRef,
}: ResolveMoonAffectedComparisonOptions): Promise<MoonAffectedComparison> => {
  const normalizedBaseRef = normalizeRevision(baseRef);
  const normalizedHeadRef = normalizeRevision(headRef) ?? 'HEAD';

  if (scope === 'staged') {
    const snapshotCommit = await createIndexSnapshotCommit({
      parentRef: 'HEAD',
      message: 'Temporary commit for moon affected staged scope\n',
    });

    return {
      base: 'HEAD',
      baseRef: 'HEAD',
      head: snapshotCommit,
      headRef: 'INDEX',
    };
  }

  if (normalizedBaseRef) {
    return {
      base: normalizedBaseRef,
      baseRef: normalizedBaseRef,
      head: normalizedHeadRef,
      headRef: normalizedHeadRef,
    };
  }

  const resolvedBase = await resolveMoonAffectedBase({ headRef: normalizedHeadRef });
  return {
    base: resolvedBase.base,
    baseRef: resolvedBase.baseRef,
    head: normalizedHeadRef,
    headRef: normalizedHeadRef,
  };
};

/** Queries Moon for affected projects with optional downstream and revision inputs. */
export const getAffectedMoonProjects = async ({
  downstream = 'none',
  base,
  head,
}: GetAffectedMoonProjectsOptions = {}): Promise<MoonProject[]> => {
  const moonExec = await getMoonExecutablePath();
  const args = ['query', 'projects', '--json', '--affected'];

  if (downstream !== 'none') {
    args.push('--downstream', downstream);
  }

  const normalizedBase = normalizeRevision(base);
  const normalizedHead = normalizeRevision(head);

  const { stdout } = await execa(moonExec, args, {
    cwd: REPO_ROOT,
    stdin: 'ignore',
    env: {
      ...process.env,
      ...(normalizedBase ? { MOON_BASE: normalizedBase } : {}),
      ...(normalizedHead ? { MOON_HEAD: normalizedHead } : {}),
      CI_STATS_DISABLED: 'true',
    },
  });

  const response = JSON.parse(stdout) as MoonQueryProjectsResponse;

  return response.projects.map((project) => {
    const sourceRoot = project.config?.project?.metadata?.sourceRoot ?? project.source;
    return {
      id: project.id,
      sourceRoot: normalizeRepoRelativePath(sourceRoot),
    };
  });
};

/** Summarizes affected Moon projects into non-root source roots and root-project flag. */
export const summarizeAffectedMoonProjects = (
  projects: MoonProject[]
): MoonAffectedProjectSummary => {
  const nonRootProjects = projects.filter((project) => project.id !== ROOT_MOON_PROJECT_ID);

  return {
    sourceRoots: nonRootProjects.map((project) => project.sourceRoot),
    isRootProjectAffected: projects.some((project) => project.id === ROOT_MOON_PROJECT_ID),
  };
};
