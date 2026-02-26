/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import * as Fs from 'fs';
import Path from 'path';

import {
  getAffectedMoonProjectIds,
  isMoonAffectedQueryDependencyPath,
  readMoonProjects,
  type MoonProjectMetadata,
} from '@kbn/moon';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

const MAX_FILTERED_TARGETS = 400;

const FULL_BUILD_TRIGGERS = new Set([
  'package.json',
  'yarn.lock',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.browser.json',
]);

const FULL_BUILD_PREFIXES = ['packages/kbn-docs-utils/'];

export interface RepoPackageLike {
  name: string;
  manifest: {
    id: string;
    plugin?: {
      id?: string;
    };
  };
  isPlugin(): boolean;
}

export interface AffectedBuildPlan {
  mode: 'full' | 'skip' | 'filtered';
  pluginFilter: string[];
  packageFilter: string[];
  message: string;
}

export interface ResolveAffectedBuildPlanOptions {
  touchedFiles: string[];
  moonProjects: MoonProjectMetadata[];
  repoPackages: RepoPackageLike[];
  maxFilteredTargets?: number;
}

const dedupeSorted = (values: string[]): string[] => {
  const unique = [...new Set(values)];
  unique.sort();
  return unique;
};

const normalizePathSeparators = (value: string): string => value.split(Path.sep).join('/');

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const getMoonBin = (): string | undefined => {
  if (process.env.MOON_BIN) {
    return process.env.MOON_BIN;
  }

  const binName = process.platform === 'win32' ? 'moon.cmd' : 'moon';
  const moonBin = Path.resolve(REPO_ROOT, 'node_modules/.bin', binName);

  if (Fs.existsSync(moonBin)) {
    return moonBin;
  }
};

const getGitMergeBase = (branch: string): string => {
  return execFileSync('git', ['merge-base', 'HEAD', branch], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
};

export interface MoonTouchedFilesOptions {
  base?: string;
  status?: string;
}

export const getMoonTouchedFilesArgs = (options: MoonTouchedFilesOptions = {}): string[] => {
  const args = ['query', 'touched-files', '--json'];

  // Without --base, moon only reports uncommitted local changes.
  if (options.base) {
    args.push('--base', options.base);
  }

  // --status filters by git status: 'staged', 'modified' (unstaged), etc.
  if (options.status) {
    args.push('--status', options.status);
  }

  return args;
};

const runMoonTouchedFilesQuery = (
  moonBin: string,
  options: MoonTouchedFilesOptions = {}
): string => {
  return execFileSync(moonBin, getMoonTouchedFilesArgs(options), {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
    env: process.env,
  });
};

export const parseTouchedFiles = (raw: string): string[] => {
  const text = raw.trim();
  if (text === '') {
    return [];
  }

  const parsed = JSON.parse(text) as unknown;

  const files = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { files?: unknown }).files)
    ? (parsed as { files: unknown[] }).files
    : [];

  return dedupeSorted(
    files
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizePathSeparators(value))
  );
};

export const requiresFullBuild = (touchedFiles: string[]): boolean => {
  return touchedFiles.some((file) => {
    if (FULL_BUILD_TRIGGERS.has(file) || isMoonAffectedQueryDependencyPath(file)) {
      return true;
    }

    return FULL_BUILD_PREFIXES.some((prefix) => file.startsWith(prefix));
  });
};

export const getApiDocTargetsForMoonProjects = (
  moonProjectIds: string[],
  repoPackages: RepoPackageLike[]
): { pluginTargets: string[]; packageTargets: string[] } => {
  const pkgByName = new Map(repoPackages.map((pkg) => [pkg.name, pkg]));
  const pluginTargets: string[] = [];
  const packageTargets: string[] = [];

  for (const projectId of moonProjectIds) {
    const pkg = pkgByName.get(projectId);
    if (!pkg) {
      continue;
    }

    if (pkg.isPlugin()) {
      const pluginId = pkg.manifest.plugin?.id;
      if (typeof pluginId === 'string') {
        pluginTargets.push(pluginId);
      }
      continue;
    }

    packageTargets.push(pkg.manifest.id);
  }

  return {
    pluginTargets: dedupeSorted(pluginTargets),
    packageTargets: dedupeSorted(packageTargets),
  };
};

export const resolveAffectedBuildPlan = ({
  touchedFiles,
  moonProjects,
  repoPackages,
  maxFilteredTargets = MAX_FILTERED_TARGETS,
}: ResolveAffectedBuildPlanOptions): AffectedBuildPlan => {
  if (requiresFullBuild(touchedFiles)) {
    return {
      mode: 'full',
      pluginFilter: [],
      packageFilter: [],
      message: 'Global docs dependencies changed. Falling back to full API docs build.',
    };
  }

  const affectedMoonProjectIds = getAffectedMoonProjectIds(touchedFiles, moonProjects);
  const targets = getApiDocTargetsForMoonProjects(affectedMoonProjectIds, repoPackages);

  const totalTargets = targets.pluginTargets.length + targets.packageTargets.length;
  if (totalTargets === 0) {
    return {
      mode: 'skip',
      pluginFilter: [],
      packageFilter: [],
      message: 'No affected plugin/package targets found. Skipping API docs build.',
    };
  }

  if (totalTargets > maxFilteredTargets) {
    return {
      mode: 'full',
      pluginFilter: [],
      packageFilter: [],
      message:
        `${totalTargets} affected targets is above threshold (` +
        `${maxFilteredTargets}), falling back to full build.`,
    };
  }

  return {
    mode: 'filtered',
    pluginFilter: targets.pluginTargets,
    packageFilter: targets.packageTargets,
    message:
      `Using affected-only mode for ${targets.pluginTargets.length} plugin(s) and ` +
      `${targets.packageTargets.length} package(s).`,
  };
};

// Maps --changes mode values to moon --status filter values.
const CHANGES_MODE_TO_MOON_STATUS: Record<string, string | undefined> = {
  all: undefined,
  staged: 'staged',
  unstaged: 'modified',
};

export const resolveAffectedBuildPlanFromMoon = (
  changesMode?: 'all' | 'staged' | 'unstaged'
): AffectedBuildPlan => {
  const moonBin = getMoonBin();
  if (!moonBin) {
    return {
      mode: 'full',
      pluginFilter: [],
      packageFilter: [],
      message: 'Moon CLI not found in node_modules/.bin, falling back to full API docs build.',
    };
  }

  const queryOptions: MoonTouchedFilesOptions = {};

  if (changesMode) {
    // --changes mode: only uncommitted local changes (no --base)
    queryOptions.status = CHANGES_MODE_TO_MOON_STATUS[changesMode];
  } else {
    // Default: diff entire branch against merge-base.
    // CI sets GITHUB_PR_MERGE_BASE to a precise merge-base SHA; prefer that
    // over computing it ourselves so the build matches the PR's target branch.
    const envBase = process.env.GITHUB_PR_MERGE_BASE;
    try {
      queryOptions.base = envBase || getGitMergeBase('main');
    } catch (error) {
      return {
        mode: 'full',
        pluginFilter: [],
        packageFilter: [],
        message:
          `Failed to compute merge-base against 'main', falling back to full build: ` +
          getErrorMessage(error),
      };
    }
  }

  let touchedFiles: string[] = [];
  try {
    touchedFiles = parseTouchedFiles(runMoonTouchedFilesQuery(moonBin, queryOptions));
  } catch (error) {
    return {
      mode: 'full',
      pluginFilter: [],
      packageFilter: [],
      message:
        'Failed to query touched files from Moon, falling back to full build: ' +
        getErrorMessage(error),
    };
  }

  let moonProjects: MoonProjectMetadata[] = [];
  try {
    moonProjects = readMoonProjects();
  } catch (error) {
    return {
      mode: 'full',
      pluginFilter: [],
      packageFilter: [],
      message:
        'Failed to read Moon project metadata, falling back to full build: ' +
        getErrorMessage(error),
    };
  }

  return resolveAffectedBuildPlan({
    touchedFiles,
    moonProjects,
    repoPackages: getPackages(REPO_ROOT),
  });
};
