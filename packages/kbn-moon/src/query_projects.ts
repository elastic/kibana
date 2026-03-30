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

import {
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

/** Options for resolving the affected base revision from git state. */
export interface ResolveMoonAffectedBaseOptions {
  headRef?: string;
}

export const ROOT_MOON_PROJECT_ID = 'kibana';

let moonExecutablePath: string | undefined;

/** Normalizes repository-relative paths to POSIX separators for stable matching. */
export const normalizeRepoRelativePath = (pathValue: string) =>
  Path.normalize(pathValue).split(Path.sep).join('/');

/** Resolves the path to the Moon executable. */
export const getMoonExecutablePath = async () => {
  if (moonExecutablePath) {
    return moonExecutablePath;
  }

  const moonBinPath = Path.resolve(REPO_ROOT, 'node_modules/.bin/moon');
  if (existsSync(moonBinPath)) {
    moonExecutablePath = moonBinPath;
    return moonExecutablePath;
  }

  const execa = (await import('execa')).default;
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

const parseMoonProjectsResponse = (stdout: string): MoonProject[] => {
  const response = JSON.parse(stdout) as MoonQueryProjectsResponse;
  return response.projects.map((project) => {
    const sourceRoot = project.config?.project?.metadata?.sourceRoot ?? project.source;
    return {
      id: project.id,
      sourceRoot: normalizeRepoRelativePath(sourceRoot),
    };
  });
};

/**
 * Queries Moon for affected projects by piping pre-resolved changed files JSON
 * into `moon query projects --affected`.
 *
 * Use this when changed files have already been resolved to avoid duplicate Moon queries.
 */
export const getAffectedMoonProjectsFromChangedFiles = async ({
  changedFilesJson,
  downstream = 'none',
}: {
  changedFilesJson: string;
  downstream?: MoonDownstreamMode;
}): Promise<MoonProject[]> => {
  const execa = (await import('execa')).default;
  const moonExec = await getMoonExecutablePath();

  const projectArgs = ['query', 'projects', '--affected'];
  if (downstream !== 'none') {
    projectArgs.push('--downstream', downstream);
  }

  const { stdout } = await execa(moonExec, projectArgs, {
    cwd: REPO_ROOT,
    input: changedFilesJson,
    env: {
      ...process.env,
      CI_STATS_DISABLED: 'true',
    },
  });

  return parseMoonProjectsResponse(stdout);
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
